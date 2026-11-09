import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'

// =============================================================================
// HEMS Projects list (for repository mapping dropdowns) —
// /api/work-intelligence/projects
// =============================================================================
// Read-only: any org member can list their organization's projects so the
// GitHub repository mapping UI can offer a project picker.
// =============================================================================

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('org_projects')
            .select('id, name')
            .eq('organization_id', session.organizationId)
            .order('name')

        if (error) {
            logger.error('Failed to list projects', { err: error.message })
            return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 })
        }

        return NextResponse.json({ projects: data ?? [] })
    } catch (error) {
        logger.error('GET /api/work-intelligence/projects failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
