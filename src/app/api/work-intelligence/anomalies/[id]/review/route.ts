import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// Anomaly Review API — /api/work-intelligence/anomalies/[id]/review
// =============================================================================
// Managers+ can acknowledge/dismiss/resolve an anomaly with a note. The
// anomaly itself (rule, evidence, explanation) is immutable — only the
// review disposition changes, preserving the audit trail (§24).
// =============================================================================

const ALLOWED = new Set(['open', 'acknowledged', 'dismissed', 'resolved'])

export async function POST(
    request: NextRequest,
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

        const { id } = await params
        const body = await request.json().catch(() => ({}))
        const status = String((body as { status?: string }).status ?? '')
        const note = ((body as { note?: string }).note ?? '').slice(0, 2000) || null

        if (!ALLOWED.has(status)) {
            return NextResponse.json(
                { error: 'status must be one of acknowledged, dismissed, resolved, open' },
                { status: 400 }
            )
        }

        const adminSupabase = await createAdminClient()
        const { data: anomaly } = await adminSupabase
            .from('activity_anomalies')
            .select('id')
            .eq('id', id)
            .eq('organization_id', session.organizationId)
            .maybeSingle()
        if (!anomaly) {
            return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 })
        }

        const { error } = await adminSupabase
            .from('activity_anomalies')
            .update({
                status,
                reviewed_by: session.userId,
                reviewed_at: new Date().toISOString(),
                review_note: note,
            })
            .eq('id', id)
        if (error) {
            logger.error('Failed to review anomaly', { err: error.message })
            return NextResponse.json({ error: 'Failed to update anomaly' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('POST /api/work-intelligence/anomalies/[id]/review failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
