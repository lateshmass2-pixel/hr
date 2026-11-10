import { getSession } from '@/lib/auth/session'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkIntelligenceNav } from '../nav'
import { CalendarClock, CheckCircle2, XCircle, Bot, Sparkles } from 'lucide-react'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// Daily Work — /dashboard/work-intelligence/daily
// =============================================================================
// Per-employee daily work report (spec §17). Employees see their own
// report for a chosen date (default today); managers see a roster of the
// org's latest reports and can open any employee's day.
// =============================================================================

function fmtDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
}

const STATUS_STYLES: Record<string, string> = {
    VERIFIED: 'bg-emerald-100 text-emerald-800',
    REVIEW_REQUIRED: 'bg-amber-100 text-amber-800',
    UNUSUAL_ACTIVITY: 'bg-orange-100 text-orange-800',
    INSUFFICIENT_EVIDENCE: 'bg-gray-100 text-gray-600',
}

export default async function DailyWorkPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string; employeeId?: string }>
}) {
    const session = await getSession()
    if (!session) redirect('/login')
    const isManager = isRoleAtLeast(session.role, 'manager')

    const params = await searchParams
    const date = params.date ?? new Date().toISOString().slice(0, 10)
    const adminSupabase = await createAdminClient()
    const supabase = await createClient()

    // Resolve target employee.
    // Employees can only view their own report — ignore any employeeId param.
    // Managers can view any employee via ?employeeId=...
    let employeeId: string | undefined = undefined
    let employeeName = 'You'
    const { data: myEmployee } = await adminSupabase
        .from('org_employees')
        .select('id, full_name')
        .eq('organization_id', session.organizationId)
        .eq('user_id', session.userId)
        .maybeSingle()

    if (isManager && params.employeeId) {
        const { data: emp } = await adminSupabase
            .from('org_employees')
            .select('id, full_name')
            .eq('organization_id', session.organizationId)
            .eq('id', params.employeeId)
            .maybeSingle()
        if (!emp) redirect('/dashboard/work-intelligence/daily')
        employeeId = emp.id
        employeeName = emp.full_name
    } else if (myEmployee) {
        employeeId = myEmployee.id
        employeeName = myEmployee.full_name
    } else {
        // No employee row: show guidance instead of an empty report.
        return (
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <WorkIntelligenceNav manager={isManager} />
                <Card className="p-8 text-center">
                    <h1 className="text-xl font-bold text-[#0a3b2a] mb-2">Daily Work Report</h1>
                    <p className="text-sm text-slate-500">
                        Your HEMS employee profile is not linked to this account yet. Ask an
                        administrator to link your user to an employee record, then connect
                        GitHub under Settings → Integrations.
                    </p>
                </Card>
            </div>
        )
    }

    const { data: report } = await adminSupabase
        .from('daily_work_reports')
        .select('*')
        .eq('organization_id', session.organizationId)
        .eq('employee_id', employeeId)
        .eq('report_date', date)
        .maybeSingle()

    // Roster of recent reports (managers only)
    const { data: recentReports } = isManager
        ? await supabase
            .from('daily_work_reports')
            .select('id, employee_id, report_date, authenticity_status, commit_count, pr_count, org_employees(full_name)')
            .eq('organization_id', session.organizationId)
            .order('report_date', { ascending: false })
            .limit(10)
        : { data: [] }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#0a3b2a] flex items-center gap-2">
                    <CalendarClock className="h-6 w-6" /> Daily Work
                </h1>
                <WorkIntelligenceNav manager={isManager} />
            </div>

            <Card className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-semibold text-[#14532d]">
                            {employeeName} — {fmtDate(date)}
                        </h2>
                        <p className="text-xs text-slate-400">
                            Generated from recorded GitHub evidence only.
                        </p>
                    </div>
                    <form method="GET" className="flex items-center gap-2">
                        {isManager && params.employeeId && (
                            <input type="hidden" name="employeeId" value={params.employeeId} />
                        )}
                        <input
                            type="date"
                            name="date"
                            defaultValue={date}
                            className="border rounded-lg px-3 py-1.5 text-sm"
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-[#14532d] text-white text-sm"
                        >
                            View
                        </button>
                    </form>
                </div>

                {!report ? (
                    <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-xl">
                        No report generated for this date yet. Reports are generated by the
                        scheduled sync, or on demand via{' '}
                        <code className="bg-slate-100 px-1 rounded">POST /api/work-intelligence/reports/daily</code>.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                ['Repositories', report.repository_count],
                                ['Commits', report.commit_count],
                                ['Pull Requests', report.pr_count],
                                ['Files Changed', report.files_changed],
                            ].map(([label, value]) => (
                                <div key={label as string} className="border rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-[#0a3b2a]">{value as number}</div>
                                    <div className="text-xs text-slate-500">{label as string}</div>
                                </div>
                            ))}
                        </div>

                        {((report.work_areas as string[]) ?? []).length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-[#14532d] mb-1">Work Areas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(report.work_areas as string[]).map((area) => (
                                        <Badge key={area} variant="secondary">{area}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-semibold text-[#14532d] mb-2">Evidence</h3>
                            <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
                                {Object.entries((report.evidence_summary as Record<string, boolean>) ?? {}).map(([key, ok]) => (
                                    <li key={key} className="flex items-center gap-2">
                                        {ok ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-slate-300" />
                                        )}
                                        <span className={ok ? 'text-slate-700' : 'text-slate-400'}>
                                            {key.replaceAll('_', ' ')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-[#14532d] mb-2">Automation</h3>
                            {((report.automation_summary as { agents?: unknown[]; bots?: unknown[] })?.agents ?? []).length === 0 &&
                             ((report.automation_summary as { agents?: unknown[]; bots?: unknown[] })?.bots ?? []).length === 0 ? (
                                <p className="text-sm text-slate-500">No AI/automation activity detected.</p>
                            ) : (
                                <div className="space-y-1.5 text-sm">
                                    {((report.automation_summary as {
                                        agents?: Array<{ agentType: string; agentName: string | null; basis: string; count: number }>
                                    })?.agents ?? []).map((a, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-blue-600" />
                                            <span>
                                                <strong>{a.agentName ?? a.agentType}</strong> — {a.count} event(s),
                                                basis: {a.basis.replaceAll('_', ' ')}
                                            </span>
                                        </div>
                                    ))}
                                    {((report.automation_summary as {
                                        bots?: Array<{ botName: string; botType: string; count: number }>
                                    })?.bots ?? []).map((b, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Bot className="h-4 w-4 text-slate-500" />
                                            <span>
                                                <strong>{b.botName}</strong> ({b.botType}) — {b.count} event(s)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {((report.anomaly_summary as unknown[]) ?? []).length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-[#14532d] mb-2">Anomalies</h3>
                                <ul className="space-y-1 text-sm">
                                    {(report.anomaly_summary as Array<{ severity: string; ruleCode: string; reason: string }>).map((a, i) => (
                                        <li key={i}>
                                            <Badge variant="outline" className={STATUS_STYLES[a.severity] ?? ''}>
                                                {a.severity}
                                            </Badge>{' '}
                                            <span className="text-slate-700">{a.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="pt-3 border-t">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={STATUS_STYLES[report.authenticity_status as string] ?? ''}>
                                    {report.authenticity_status}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mt-2">{report.status_reason}</p>
                            {report.ai_summary && (
                                <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                                    <div className="text-xs font-semibold text-slate-500 mb-1">AI summary (generated from recorded facts)</div>
                                    {report.ai_summary}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Card>

            {/* Manager roster */}
            {recentReports && recentReports.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-[#14532d] mb-3">Recent Daily Reports (org)</h2>
                    <ul className="divide-y divide-slate-50 text-sm">
                        {(recentReports as Array<{
                            id: string
                            employee_id: string
                            report_date: string
                            authenticity_status: string
                            commit_count: number
                            pr_count: number
                            org_employees: { full_name: string } | { full_name: string }[] | null
                        }>).map((r) => {
                            const name = Array.isArray(r.org_employees)
                                ? r.org_employees[0]?.full_name ?? 'Unknown'
                                : r.org_employees?.full_name ?? 'Unknown'
                            return (
                                <li key={r.id} className="py-2 flex items-center gap-3">
                                    <span className="font-medium text-[#0a3b2a] flex-1">{name}</span>
                                    <span className="text-xs text-slate-400">{r.report_date}</span>
                                    <span className="text-xs text-slate-500">
                                        {r.commit_count} commits · {r.pr_count} PRs
                                    </span>
                                    <Badge variant="outline" className={STATUS_STYLES[r.authenticity_status] ?? ''}>
                                        {r.authenticity_status}
                                    </Badge>
                                    <a
                                        href={`/dashboard/work-intelligence/daily?employeeId=${r.employee_id}&date=${r.report_date}`}
                                        className="text-xs text-blue-700 hover:underline"
                                    >
                                        open
                                    </a>
                                </li>
                            )
                        })}
                    </ul>
                </Card>
            )}
        </div>
    )
}
