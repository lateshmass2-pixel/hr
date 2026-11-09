import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    getWorkIntelligenceOverview,
    getEmployeeGitSummaries,
    getTodayActivityFeed,
} from '@/lib/work-intelligence/queries'
import { WorkIntelligenceNav } from './nav'
import { isRoleAtLeast } from '@/lib/rbac/types'
import { Activity, GitCommitHorizontal, GitPullRequest, ShieldCheck, AlertTriangle, Bot, Sparkles } from 'lucide-react'

// =============================================================================
// Work Intelligence Overview — /dashboard/work-intelligence
// =============================================================================
// Evidence-first dashboard (spec §18): overview metrics, today's activity,
// employee roster with drill-down, open anomalies. Minimal charts; the point
// is verifiable evidence, not vanity graphs.
// =============================================================================

export default async function WorkIntelligencePage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const supabase = await createClient()
    const isManager = isRoleAtLeast(session.role, 'manager')

    const overview = await getWorkIntelligenceOverview(supabase, session.organizationId)
    const activity = isManager
        ? await getTodayActivityFeed(supabase, session.organizationId, 30)
        : []
    const employees = isManager
        ? await getEmployeeGitSummaries(supabase, session.organizationId)
        : []

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[#0a3b2a]">Work Intelligence</h1>
                    <p className="text-sm text-[#14532d]/70">
                        Verifiable engineering evidence from GitHub — commits, reviews, CI and
                        task correlation. Evidence-based, never surveillance.
                    </p>
                </div>
                <WorkIntelligenceNav />
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <GitCommitHorizontal className="h-4 w-4" /> Commits (7d)
                    </div>
                    <div className="text-3xl font-bold text-[#0a3b2a] mt-1">{overview.commitsLast7Days}</div>
                    <div className="text-xs text-slate-400">{overview.connectedRepositories} repositories connected</div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <GitPullRequest className="h-4 w-4" /> Pull Requests (7d)
                    </div>
                    <div className="text-3xl font-bold text-[#0a3b2a] mt-1">{overview.prsLast7Days}</div>
                    <div className="text-xs text-slate-400">{overview.reviewsLast7Days} reviews</div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <ShieldCheck className="h-4 w-4" /> Verified reports (30d)
                    </div>
                    <div className="text-3xl font-bold text-emerald-700 mt-1">{overview.verifiedReports}</div>
                    <div className="text-xs text-slate-400">
                        {overview.reviewRequiredReports} review required · {overview.insufficientEvidenceReports} insufficient
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <AlertTriangle className="h-4 w-4" /> Open anomalies
                    </div>
                    <div className={`text-3xl font-bold mt-1 ${overview.openAnomalies > 0 ? 'text-amber-600' : 'text-[#0a3b2a]'}`}>
                        {overview.openAnomalies}
                    </div>
                    <div className="text-xs text-slate-400">patterns flagged for review, not misconduct findings</div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Today's activity */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5" /> Today's Activity
                    </h2>
                    {activity.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">
                            No activity recorded today yet{isManager ? '' : ' (managers see the org-wide feed here)'}.
                        </p>
                    ) : (
                        <ul className="space-y-2 max-h-96 overflow-y-auto">
                            {activity.map((row) => (
                                <li key={`${row.kind}-${row.id}`} className="text-sm border-b border-slate-50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 w-16 shrink-0">
                                            {new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <Badge variant="secondary" className="capitalize">{row.kind}</Badge>
                                        <span className="text-xs text-slate-500">{row.actor ?? 'unknown'}</span>
                                    </div>
                                    <div className="ml-18 pl-[4.5rem] text-slate-700">{row.description}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Employees with drill-down */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-4">
                        <ShieldCheck className="h-5 w-5" /> Employees
                    </h2>
                    {!isManager ? (
                        <p className="text-sm text-slate-500 py-4">
                            Managers and above see the employee evidence roster here. Your own
                            evidence is on the Daily Work and Work Timeline pages.
                        </p>
                    ) : employees.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">No active employees found.</p>
                    ) : (
                        <ul className="space-y-2 max-h-96 overflow-y-auto divide-y divide-slate-50">
                            {employees.map((e) => (
                                <li key={e.employeeId} className="flex items-center gap-3 py-2">
                                    <div className="h-8 w-8 rounded-full bg-[#14532d]/10 text-[#14532d] flex items-center justify-center text-xs font-semibold">
                                        {e.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/dashboard/work-intelligence/employee/${e.employeeId}`}
                                            className="text-sm font-medium text-[#0a3b2a] hover:underline"
                                        >
                                            {e.fullName}
                                        </Link>
                                        <div className="text-xs text-slate-500">
                                            {e.githubUsernames.length > 0
                                                ? `@${e.githubUsernames.join(', @')}`
                                                : 'no GitHub connected'}
                                            {' · '}{e.commits7d} commits (7d)
                                        </div>
                                    </div>
                                    {e.lastReportStatus && (
                                        <Badge
                                            variant="outline"
                                            className={
                                                e.lastReportStatus === 'VERIFIED'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : e.lastReportStatus === 'REVIEW_REQUIRED'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : e.lastReportStatus === 'UNUSUAL_ACTIVITY'
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-gray-100 text-gray-600'
                                            }
                                        >
                                            {e.lastReportStatus.replaceAll('_', ' ').toLowerCase()}
                                        </Badge>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            {/* AI & automation strip */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5" /> AI & Automation (explicit provenance only)
                </h2>
                <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-[#0a3b2a]">{overview.agentEventsCount}</span>
                        <span className="text-slate-500">AI-agent events detected via co-author trailers / app identities</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-[#0a3b2a]">{overview.automationEventsCount}</span>
                        <span className="text-slate-500">bot/automation events (Dependabot, CI apps, …)</span>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    HEMS only records AI/automation involvement when GitHub metadata explicitly
                    shows it (co-author trailers, GitHub App identities, bot accounts). It never
                    guesses from code style.
                </p>
            </Card>
        </div>
    )
}
