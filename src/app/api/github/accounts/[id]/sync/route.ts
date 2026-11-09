import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// Account Sync Trigger — /api/github/accounts/[id]/sync
// =============================================================================
// POST: trigger an on-demand evidence sync for one connected repository set
//       (manager+ only) — runs the incremental sync engine.
// PATCH: toggle sync_enabled for the account (owner or hr+, same rules as
//        /api/github/accounts PATCH).
// =============================================================================

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        if (!isRoleAtLeast(session.role, 'manager')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id: accountId } = await params
        const adminSupabase = await createAdminClient()

        const { data: account } = await adminSupabase
            .from('git_accounts')
            .select('id, organization_id, status, sync_enabled')
            .eq('id', accountId)
            .eq('organization_id', session.organizationId)
            .maybeSingle()
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }
        if (account.status === 'DISCONNECTED' || !account.sync_enabled) {
            return NextResponse.json(
                { error: 'Account sync is disabled or disconnected' },
                { status: 409 }
            )
        }

        // Sync all active repositories in this org (the account's token is
        // used by the sync engine).
        const { syncRepository } = await import('@/lib/work-intelligence/sync')
        const { data: repos } = await adminSupabase
            .from('git_repositories')
            .select('id')
            .eq('organization_id', session.organizationId)
            .eq('is_active', true)

        const results = []
        for (const repo of (repos ?? []) as Array<{ id: string }>) {
            results.push(await syncRepository(adminSupabase, repo.id))
        }

        const now = new Date().toISOString()
        await adminSupabase
            .from('git_accounts')
            .update({
                status: results.some((r) => r.status !== 'SYNCED')
                    ? (results.some((r) => r.status === 'REAUTH_REQUIRED') ? 'REAUTH_REQUIRED' : 'ERROR')
                    : 'SYNCED',
                last_synced_at: now,
            })
            .eq('id', accountId)

        return NextResponse.json({
            success: true,
            repositories: results.map((r) => ({
                repositoryId: r.repositoryId,
                status: r.status,
                commitsIngested: r.commitsIngested,
                detail: r.detail ?? null,
            })),
        })
    } catch (error) {
        logger.error('POST /api/github/accounts/[id]/sync failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const { id: accountId } = await params
        const adminSupabase = await createAdminClient()

        const { data: account } = await adminSupabase
            .from('git_accounts')
            .select('id, employee_id, user_id, status')
            .eq('id', accountId)
            .eq('organization_id', session.organizationId)
            .maybeSingle()
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        if (!isRoleAtLeast(session.role, 'hr')) {
            const { data: myEmp } = await adminSupabase
                .from('org_employees')
                .select('id')
                .eq('organization_id', session.organizationId)
                .eq('user_id', session.userId)
                .maybeSingle()
            const isMine =
                account.user_id === session.userId ||
                account.employee_id === myEmp?.id
            if (!isMine) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        const body = await request.json().catch(() => ({}))
        const enabled = Boolean((body as { enabled?: boolean }).enabled)

        const { error } = await adminSupabase
            .from('git_accounts')
            .update({
                sync_enabled: enabled,
                ...(enabled && account.status !== 'DISCONNECTED'
                    ? { status: 'CONNECTED' }
                    : {}),
            })
            .eq('id', accountId)
        if (error) {
            logger.error('Failed to update account sync setting', { err: error.message })
            return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('PATCH /api/github/accounts/[id]/sync failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
