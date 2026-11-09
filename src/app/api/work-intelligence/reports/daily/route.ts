import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { getSession } from '@/lib/auth/session'
import { isRoleAtLeast } from '@/lib/rbac/types'
import { generateDailyReport } from '@/lib/work-intelligence/reports'
import { generateAiWorkSummary } from '@/lib/work-intelligence/ai-summary'

// =============================================================================
// Daily Work Report API — /api/work-intelligence/reports/daily
// =============================================================================
// GET ?employeeId=&date=  — load a stored report (employees: own only;
//                          manager+: any in their org)
// POST { employeeId, date, withAi } — (re)compute the report from evidence.
//                          Employees may compute their own; manager+ any.
// =============================================================================

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function isValidDate(d: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

async function canViewEmployee(
    session: { organizationId: string; userId: string; role: string },
    employeeId: string
): Promise<boolean> {
    if (isRoleAtLeast(session.role as never, 'manager')) return true;
    const adminSupabase = await createAdminClient();
    const { data } = await adminSupabase
        .from('org_employees')
        .select('id')
        .eq('organization_id', session.organizationId)
        .eq('id', employeeId)
        .eq('user_id', session.userId)
        .maybeSingle();
    return Boolean(data);
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const params = request.nextUrl.searchParams;
        const employeeId = params.get('employeeId');
        const date = params.get('date') ?? today();
        if (!employeeId || !isValidDate(date)) {
            return NextResponse.json({ error: 'employeeId and date (YYYY-MM-DD) are required' }, { status: 400 });
        }
        if (!(await canViewEmployee(session, employeeId))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const adminSupabase = await createAdminClient();
        const { data: report, error } = await adminSupabase
            .from('daily_work_reports')
            .select('*')
            .eq('organization_id', session.organizationId)
            .eq('employee_id', employeeId)
            .eq('report_date', date)
            .maybeSingle();

        if (error) {
            logger.error('Failed to load daily report', { err: error.message });
            return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
        }
        return NextResponse.json({ report: report ?? null });
    } catch (error) {
        logger.error('GET /api/work-intelligence/reports/daily failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const body = await request.json().catch(() => null);
        const employeeId = String((body as { employeeId?: string } | null)?.employeeId ?? '');
        const date = (body as { date?: string } | null)?.date ?? today();
        const withAi = Boolean((body as { withAi?: boolean } | null)?.withAi);

        if (!employeeId || !isValidDate(date)) {
            return NextResponse.json({ error: 'employeeId and date (YYYY-MM-DD) are required' }, { status: 400 });
        }
        if (!(await canViewEmployee(session, employeeId))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const adminSupabase = await createAdminClient();

        // Verify the employee exists in this org.
        const { data: employee } = await adminSupabase
            .from('org_employees')
            .select('full_name')
            .eq('organization_id', session.organizationId)
            .eq('id', employeeId)
            .maybeSingle();
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const result = await generateDailyReport(adminSupabase, {
            organizationId: session.organizationId,
            employeeId,
            date,
        });

        // Optional AI summary — reuses the report's verified facts.
        let aiSummary = null;
        if (withAi) {
            const summary = await generateAiWorkSummary(
                { fullName: employee.full_name, dateLabel: date },
                result
            );
            aiSummary = summary;

            // Persist the AI summary alongside the report.
            await adminSupabase
                .from('daily_work_reports')
                .update({
                    ai_summary: summary.summary,
                    ai_generated_at: summary.generatedAt,
                })
                .eq('organization_id', session.organizationId)
                .eq('employee_id', employeeId)
                .eq('report_date', date);
        }

        return NextResponse.json({ report: result, aiSummary });
    } catch (error) {
        logger.error('POST /api/work-intelligence/reports/daily failed', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
