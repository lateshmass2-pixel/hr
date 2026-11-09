import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// GitHub Accounts API — /api/github/accounts
// =============================================================================
// RBAC (spec §22):
//   * GET     — employees see their own connected accounts; manager+ see all
//               org accounts. Never returns tokens or token metadata.
//   * DELETE  — an employee may disconnect their OWN account; hr+ may
//               disconnect any.
//   * PATCH   — toggle sync_enabled for one's own account (hr+ for others).
//
// Tokens (access_token_encrypted) are NEVER selected or returned here.
// =============================================================================

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const { organizationId, role, userId } = session
        const adminSupabase = await createAdminClient()

        const myEmp = await myEmployeeId(adminSupabase, organizationId, userId)

        let query = adminSupabase
            .from('git_accounts')
            .select(`
                id,
                employee_id,
                github_username,
                display_name,
                email,
                avatar_url,
                status,
                last_error,
                connected_at,
                last_synced_at,
                sync_enabled,
                is_bot,
                bot_type,
                identity_source,
                org_employees ( full_name )
            `)
            .eq('organization_id', organizationId)
            .order('connected_at', { ascending: false })

        // Employees only see their own accounts.
        if (!isRoleAtLeast(role, 'manager')) {
            if (!myEmp) {
                return NextResponse.json({ accounts: [] })
            }
            query = query.eq('employee_id', myEmp)
        }

        const { data: accounts, error } = await query
        if (error) {
            logger.error('Failed to fetch GitHub accounts', { err: error.message })
            return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
        }

        const formatted = (accounts ?? []).map((account: AccountRow) => ({
            id: account.id,
            employeeId: account.employee_id,
            employeeName: Array.isArray(account.org_employees)
                ? account.org_employees[0]?.full_name ?? null
                : account.org_employees?.full_name ?? null,
            githubUsername: account.github_username,
            displayName: account.display_name,
            email: account.email,
            avatarUrl: account.avatar_url,
            status: account.status,
            lastError: account.last_error,
            connectedAt: account.connected_at,
            lastSyncedAt: account.last_synced_at,
            syncEnabled: account.sync_enabled,
            isBot: account.is_bot,
            botType: account.bot_type,
            identitySource: account.identity_source,
        }))

        return NextResponse.json({ accounts: formatted })
    } catch (error) {
        logger.error('GET /api/github/accounts failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

interface AccountRow {
    id: string
    employee_id: string | null
    github_username: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
    status: string
    last_error: string | null
    connected_at: string
    last_synced_at: string | null
    sync_enabled: boolean
    is_bot: boolean
    bot_type: string | null
    identity_source: string
    org_employees: { full_name: string } | { full_name: string }[] | null
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const { organizationId, role, userId } = session
        const adminSupabase = await createAdminClient()

        const accountId = new URL(request.url).searchParams.get('id')
        if (!accountId) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
        }

        const { data: account } = await adminSupabase
            .from('git_accounts')
            .select('id, employee_id, user_id')
            .eq('id', accountId)
            .eq('organization_id', organizationId)
            .maybeSingle()
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        // Ownership: hr+ may disconnect any; otherwise it must be the
        // caller's own account.
        if (!isRoleAtLeast(role, 'hr')) {
            const myEmp = await myEmployeeId(adminSupabase, organizationId, userId)
            const isMine =
                account.user_id === userId ||
                (account.employee_id !== null && account.employee_id === myEmp)
            if (!isMine) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        // Soft-disconnect rather than hard delete: historical evidence rows
        // reference git_accounts and must survive for audit (§24). A hard
        // delete would SET NULL the FKs and orphan the provenance chain.
        const { error } = await adminSupabase
            .from('git_accounts')
            .update({
                status: 'DISCONNECTED',
                sync_enabled: false,
                access_token_encrypted: null,
                last_error: 'Disconnected by user',
            })
            .eq('id', accountId)
        if (error) {
            logger.error('Failed to disconnect account', { err: error.message })
            return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('DELETE /api/github/accounts failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const { organizationId, role, userId } = session
        const adminSupabase = await createAdminClient()

        const accountId = new URL(request.url).searchParams.get('id')
        if (!accountId) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const enabled = Boolean((body as { enabled?: boolean }).enabled)

        const { data: account } = await adminSupabase
            .from('git_accounts')
            .select('id, employee_id, user_id, status')
            .eq('id', accountId)
            .eq('organization_id', organizationId)
            .maybeSingle()
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        if (!isRoleAtLeast(role, 'hr')) {
            const myEmp = await myEmployeeId(adminSupabase, organizationId, userId)
            const isMine = account.user_id === userId || account.employee_id === myEmp
            if (!isMine) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        // Pausing sync keeps the connection but stops evidence collection.
        // Re-enabling a still-connected account restores CONNECTED; a
        // DISCONNECTED account needs re-auth, which is surfaced in the UI.
        const currentStatus: string = account.status
        const { error } = await adminSupabase
            .from('git_accounts')
            .update({
                sync_enabled: enabled,
                ...(enabled && currentStatus !== 'DISCONNECTED'
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
        logger.error('PATCH /api/github/accounts failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

async function myEmployeeId(
    adminSupabase: AdminClient,
    organizationId: string,
    userId: string
): Promise<string | null> {
    const { data } = await adminSupabase
        .from('org_employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle()
    return data?.id ?? null
}
