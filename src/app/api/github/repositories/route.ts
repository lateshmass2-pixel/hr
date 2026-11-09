import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'
import { isRoleAtLeast } from '@/lib/rbac/types'
import { GitHubClient, safeGitHub } from '@/lib/work-intelligence/github-client'
import { decryptToken } from '@/lib/work-intelligence/crypto'
import { syncRepository } from '@/lib/work-intelligence/sync'

// =============================================================================
// GitHub Repositories API — /api/github/repositories
// =============================================================================
// Repository integration (spec §4). Manager+ RBAC.
//   GET            — list connected repositories (org members can read)
//   POST           — connect a repository by owner/name, optionally map to a
//                    HEMS project. Verifies the repo exists via the GitHub
//                    API (with the org token) before storing.
//   PATCH ?id=     — update project mapping / active flag / trigger sync
//   DELETE ?id=    — deactivate (soft) — evidence is append-only (§30)
// =============================================================================

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const adminSupabase = await createAdminClient()

        const { data: repos, error } = await adminSupabase
            .from('git_repositories')
            .select(`
                id,
                github_repo_id,
                owner,
                name,
                full_name,
                url,
                default_branch,
                visibility,
                is_active,
                sync_status,
                last_error,
                last_synced_at,
                project_id,
                org_projects ( id, name )
            `)
            .eq('organization_id', session.organizationId)
            .order('full_name')

        if (error) {
            logger.error('Failed to list repositories', { err: error.message })
            return NextResponse.json({ error: 'Failed to list repositories' }, { status: 500 })
        }

        return NextResponse.json({
            repositories: (repos ?? []).map((r: RepoRow) => ({
                id: r.id,
                githubRepoId: r.github_repo_id,
                owner: r.owner,
                name: r.name,
                fullName: r.full_name,
                url: r.url,
                defaultBranch: r.default_branch,
                visibility: r.visibility,
                isActive: r.is_active,
                syncStatus: r.sync_status,
                lastError: r.last_error,
                lastSyncedAt: r.last_synced_at,
                projectId: r.project_id,
                projectName: Array.isArray(r.org_projects)
                    ? r.org_projects[0]?.name ?? null
                    : r.org_projects?.name ?? null,
            })),
        })
    } catch (error) {
        logger.error('GET /api/github/repositories failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

interface RepoRow {
    id: string
    github_repo_id: number
    owner: string
    name: string
    full_name: string
    url: string
    default_branch: string
    visibility: string
    is_active: boolean
    sync_status: string
    last_error: string | null
    last_synced_at: string | null
    project_id: string | null
    org_projects: { id: string; name: string } | { id: string; name: string }[] | null
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        if (!isRoleAtLeast(session.role, 'manager')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json().catch(() => null)
        const fullName = String(
            (body as { fullName?: string } | null)?.fullName ?? ''
        ).trim()
        const projectId =
            ((body as { projectId?: string | null } | null)?.projectId || null) as string | null

        if (!fullName || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) {
            return NextResponse.json(
                { error: 'fullName must be "owner/repo"' },
                { status: 400 }
            )
        }

        const adminSupabase = await createAdminClient()

        // Verify the repository exists (org token; anonymous for public).
        const token = await getOrgToken(adminSupabase, session.organizationId)
        const gh = new GitHubClient(token)
        const repoInfo = await safeGitHub(
            () => gh.getRepo(fullName),
            `connect repo ${fullName}`
        )
        if (!repoInfo) {
            return NextResponse.json(
                { error: `Repository ${fullName} not found or not accessible with the connected token` },
                { status: 404 }
            )
        }

        // Optional: validate the project belongs to this org.
        if (projectId) {
            const { data: project } = await adminSupabase
                .from('org_projects')
                .select('id')
                .eq('id', projectId)
                .eq('organization_id', session.organizationId)
                .maybeSingle()
            if (!project) {
                return NextResponse.json(
                    { error: 'Project not found in this organization' },
                    { status: 400 }
                )
            }
        }

        const { data: repo, error } = await adminSupabase
            .from('git_repositories')
            .upsert(
                {
                    organization_id: session.organizationId,
                    github_repo_id: repoInfo.id,
                    owner: repoInfo.owner.login,
                    name: repoInfo.name,
                    full_name: repoInfo.full_name,
                    url: repoInfo.html_url,
                    default_branch: repoInfo.default_branch ?? 'main',
                    visibility: repoInfo.private ? 'private' : 'public',
                    is_active: true,
                    sync_status: 'CONNECTED',
                    project_id: projectId,
                },
                { onConflict: 'github_repo_id' }
            )
            .select('id')
            .single()

        if (error || !repo) {
            logger.error('Failed to connect repository', { err: error?.message })
            return NextResponse.json({ error: 'Failed to connect repository' }, { status: 500 })
        }

        // Kick off an initial (bounded) sync in the background of the request
        // — failures update sync_status, they don't fail the connect.
        const outcome = await syncRepository(adminSupabase, repo.id).catch(() => null)

        return NextResponse.json({
            success: true,
            repositoryId: repo.id,
            initialSync: outcome
                ? { status: outcome.status, commits: outcome.commitsIngested, detail: outcome.detail ?? null }
                : null,
        })
    } catch (error) {
        logger.error('POST /api/github/repositories failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        if (!isRoleAtLeast(session.role, 'manager')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const id = new URL(request.url).searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const patch: Record<string, unknown> = {}

        if ('projectId' in (body as Record<string, unknown>)) {
            const projectId = (body as { projectId: string | null }).projectId
            if (projectId) {
                const { data: project } = await (await createAdminClient())
                    .from('org_projects')
                    .select('id')
                    .eq('id', projectId)
                    .eq('organization_id', session.organizationId)
                    .maybeSingle()
                if (!project) {
                    return NextResponse.json(
                        { error: 'Project not found in this organization' },
                        { status: 400 }
                    )
                }
            }
            patch.project_id = projectId
        }
        if ('isActive' in (body as Record<string, unknown>)) {
            patch.is_active = Boolean((body as { isActive: boolean }).isActive)
        }
        if ((body as { action?: string }).action === 'sync') {
            const adminSupabase = await createAdminClient()
            const outcome = await syncRepository(adminSupabase, id)
            return NextResponse.json({ success: true, sync: outcome })
        }

        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
        }

        const adminSupabase = await createAdminClient()
        const { error } = await adminSupabase
            .from('git_repositories')
            .update(patch)
            .eq('id', id)
            .eq('organization_id', session.organizationId)
        if (error) {
            logger.error('Failed to update repository', { err: error.message })
            return NextResponse.json({ error: 'Failed to update repository' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('PATCH /api/github/repositories failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        if (!isRoleAtLeast(session.role, 'hr')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const id = new URL(request.url).searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 })
        }

        const adminSupabase = await createAdminClient()
        // Soft-deactivate: historical evidence is append-only (§30) and rows
        // reference the repository. is_active=false stops ingestion.
        const { error } = await adminSupabase
            .from('git_repositories')
            .update({ is_active: false })
            .eq('id', id)
            .eq('organization_id', session.organizationId)
        if (error) {
            logger.error('Failed to deactivate repository', { err: error.message })
            return NextResponse.json({ error: 'Failed to deactivate repository' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('DELETE /api/github/repositories failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function getOrgToken(
    adminSupabase: Awaited<ReturnType<typeof createAdminClient>>,
    organizationId: string
): Promise<string | null> {
    const { data } = await adminSupabase
        .from('git_accounts')
        .select('access_token_encrypted, sync_enabled, status')
        .eq('organization_id', organizationId)
        .eq('sync_enabled', true)
        .not('access_token_encrypted', 'is', null)
        .order('connected_at', { ascending: true })
        .limit(1)
        .maybeSingle()
    if (!data) return null
    if (data.status === 'REAUTH_REQUIRED' || data.status === 'DISCONNECTED') return null
    return decryptToken(data.access_token_encrypted)
}
