import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// GitHub Account by ID — /api/github/accounts/[id]
// =============================================================================
// Thin per-account variant of /api/github/accounts with identical RBAC:
// the account must belong to the caller (or the caller is hr+). The [id] is
// taken from the path, not a query param.
// =============================================================================

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

async function loadOwnAccount(
    adminSupabase: AdminClient,
    session: { organizationId: string; userId: string; role: string },
    accountId: string
): Promise<{ id: string } | null | 'forbidden'> {
    const { data: account } = await adminSupabase
        .from('git_accounts')
        .select('id, employee_id, user_id')
        .eq('id', accountId)
        .eq('organization_id', session.organizationId)
        .maybeSingle()
    if (!account) return null

    if (isRoleAtLeast(session.role as never, 'hr')) return account

    const { data: myEmp } = await adminSupabase
        .from('org_employees')
        .select('id')
        .eq('organization_id', session.organizationId)
        .eq('user_id', session.userId)
        .maybeSingle()
    const isMine =
        account.user_id === session.userId ||
        (account.employee_id !== null && account.employee_id === myEmp?.id)
    return isMine ? account : 'forbidden'
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }
        const { id } = await params
        const adminSupabase = await createAdminClient()

        const account = await loadOwnAccount(adminSupabase, {
            organizationId: session.organizationId,
            userId: session.userId,
            role: session.role,
        }, id)
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }
        if (account === 'forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Soft-disconnect preserves evidence FKs (audit trail, §24).
        const { error } = await adminSupabase
            .from('git_accounts')
            .update({
                status: 'DISCONNECTED',
                sync_enabled: false,
                access_token_encrypted: null,
                last_error: 'Disconnected by user',
            })
            .eq('id', id)
        if (error) {
            logger.error('Failed to disconnect account', { err: error.message })
            return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('DELETE /api/github/accounts/[id] failed', error)
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
        const { id } = await params
        const adminSupabase = await createAdminClient()

        const account = await loadOwnAccount(adminSupabase, {
            organizationId: session.organizationId,
            userId: session.userId,
            role: session.role,
        }, id)
        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }
        if (account === 'forbidden') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json().catch(() => ({}))
        const enabled = Boolean((body as { enabled?: boolean }).enabled)

        const { data: current } = await adminSupabase
            .from('git_accounts')
            .select('status')
            .eq('id', id)
            .maybeSingle()
        const currentStatus: string | undefined = current?.status

        const { error } = await adminSupabase
            .from('git_accounts')
            .update({
                sync_enabled: enabled,
                ...(enabled && currentStatus !== 'DISCONNECTED'
                    ? { status: 'CONNECTED' }
                    : {}),
            })
            .eq('id', id)
        if (error) {
            logger.error('Failed to update account', { err: error.message })
            return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('PATCH /api/github/accounts/[id] failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
