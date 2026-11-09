import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkIntelligenceNav } from '../../nav'
import { getEmployeeEvidenceView } from '@/lib/work-intelligence/queries'
import { buildTimeline } from '@/lib/work-intelligence/timeline'
import { isRoleAtLeast } from '@/lib/rbac/types'
import { ArrowLeft, GitCommitHorizontal, GitPullRequest, ShieldCheck, Sparkles, Bot, AlertTriangle, Link2 } from 'lucide-react'

// =============================================================================
// Employee Work Intelligence — /dashboard/work-intelligence/employee/[id]
// =============================================================================
// Spec §19 sections: Overview, Git Activity, Work Timeline, Tasks→Code
// correlation, Code Changes, Tests/CI, AI & Automation, Anomalies, Evidence.
// Managers+ see any employee; employees see only themselves.
// =============================================================================

const STATUS_STYLES: Record<string, string> = {
    VERIFIED: 'bg-emerald-100 text-emerald-800',
    REVIEW_REQUIRED: 'bg-amber-100 text-amber-800',
    UNUSUAL_ACTIVITY: 'bg-orange-100 text-orange-800',
    INSUFFICIENT_EVIDENCE: 'bg-gray-100 text-gray-600',
}

export default async function EmployeeWorkIntelligencePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getSession()
    if (!session) redirect('/login')

    const { id: employeeId } = await params
    const supabase = await createClient()
    const adminScope = await createClient()

    // Access control: managers+ any employee; employees only themselves.
    const isManager = isRoleAtLeast(session.role, 'manager')
    if (!isManager) {
        const { data: myEmployee } = await adminScope
            .from('org_employees')
            .select('id')
            .eq('organization_id', session.organizationId)
            .eq('user_id', session.userId)
            .maybeSingle()
        if (myEmployee?.id !== employeeId) {
            redirect('/dashboard/work-intelligence')
        }
    }

    const view = await getEmployeeEvidenceView(supabase, session.organizationId, employeeId)
    if (!view.employee) {
        return (
            <div className="p-6 max-w-5xl mx-auto space-y-4">
                <WorkIntelligenceNav />
                <Card className="p-8 text-center text-slate-500">
                    Employee not found in this organization.
                </Card>
            </div>
        )
    }

    const timeline = await buildTimeline(supabase, {
        organizationId: session.organizationId,
        employeeId,
        limit: 100,
    })

    const today = new Date().toISOString().slice(0, 10)
    const todayReport = view.reports.find((r) => r.date === today)

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/work-intelligence" className="text-slate-400 hover:text-[#14532d]">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-[#0a3b2a]">
                        {view.employee.fullName} — Work Intelligence
                    </h1>
                </div>
                <WorkIntelligenceNav />
            </div>

            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1"><GitCommitHorizontal className="h-3.5 w-3.5" /> Commits (30d)</div>
                    <div className="text-2xl font-bold text-[#0a3b2a]">{view.commits.filter((c) => !c.isBot).length}</div>
                    <div className="text-[11px] text-slate-400">+{view.commits.filter((c) => c.isBot).length} bot commits</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1"><GitPullRequest className="h-3.5 w-3.5" /> Pull Requests</div>
                    <div className="text-2xl font-bold text-[#0a3b2a]">{view.pullRequests.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs text-slate-500">Reviews</div>
                    <div className="text-2xl font-bold text-[#0a3b2a]">{view.reviews.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-xs text-slate-500">Today's status</div>
                    {todayReport ? (
                        <>
                            <Badge variant="outline" className={STATUS_STYLES[todayReport.status] ?? ''}>
                                {todayReport.status.replaceAll('_', ' ')}
                            </Badge>
                            <div className="text-[11px] text-slate-400 mt-1">{todayReport.commits} commits today</div>
                        </>
                    ) : (
                        <span className="text-sm text-slate-400">no report yet</span>
                    )}
                </Card>
            </div>

            {/* Connected GitHub identities */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">GitHub Identities</h2>
                {view.accounts.length === 0 ? (
                    <p className="text-sm text-slate-500">No GitHub accounts connected.</p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {view.accounts.map((a) => (
                            <li key={a.id} className="flex items-center gap-3 flex-wrap">
                                <span className="font-medium text-[#0a3b2a]">@{a.githubUsername}</span>
                                <Badge variant="outline">{a.status}</Badge>
                                <Badge variant="secondary">{a.identitySource}</Badge>
                                {a.isBot && <Badge variant="secondary">bot</Badge>}
                                <span className="text-xs text-slate-400">
                                    connected {new Date(a.connectedAt).toLocaleDateString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Task → code correlation */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <Link2 className="h-5 w-5" /> Tasks → Code Correlation
                </h2>
                {view.taskLinks.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No task↔git links recorded. Links are created automatically when branch
                        names or commit messages reference a HEMS task id, or manually by
                        authorized users.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-50 text-sm">
                        {view.taskLinks.map((t) => (
                            <li key={t.id} className="py-2 flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-[#0a3b2a]">{t.taskTitle ?? 'Task'}</span>
                                {t.branchName && <Badge variant="secondary">{t.branchName}</Badge>}
                                {t.commitId && <Badge variant="outline">commit</Badge>}
                                {t.prId && <Badge variant="outline">PR</Badge>}
                                <span className="text-xs text-slate-400">{t.basis?.replaceAll('_', ' ')}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Code changes */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <GitCommitHorizontal className="h-5 w-5" /> Code Changes (30d)
                </h2>
                {view.commits.length === 0 ? (
                    <p className="text-sm text-slate-500">No commits recorded in the last 30 days.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 border-b">
                                    <th className="py-2 pr-3">When</th>
                                    <th className="py-2 pr-3">Commit</th>
                                    <th className="py-2 pr-3">Repo</th>
                                    <th className="py-2 pr-3">Category</th>
                                    <th className="py-2 pr-3">Diff</th>
                                    <th className="py-2 pr-3">Identity</th>
                                    <th className="py-2">Meaning</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {view.commits.slice(0, 30).map((c) => (
                                    <tr key={c.id}>
                                        <td className="py-2 pr-3 text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(c.committedAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 pr-3">
                                            {c.url ? (
                                                <a href={c.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-700 hover:underline">
                                                    {c.sha.slice(0, 7)}
                                                </a>
                                            ) : (
                                                <span className="font-mono text-xs">{c.sha.slice(0, 7)}</span>
                                            )}
                                            <div className="text-slate-600 max-w-xs truncate">{c.message.split('\n')[0]}</div>
                                        </td>
                                        <td className="py-2 pr-3 text-xs text-slate-500">{c.repository ?? '—'}</td>
                                        <td className="py-2 pr-3">{c.category && <Badge variant="outline">{c.category}</Badge>}</td>
                                        <td className="py-2 pr-3 text-xs text-slate-500">+{c.additions}/−{c.deletions}</td>
                                        <td className="py-2 pr-3">
                                            <Badge variant="secondary" className="text-[10px]">{c.identitySource.replaceAll('_', ' ')}</Badge>
                                        </td>
                                        <td className="py-2 text-xs text-slate-600">{c.meaningfulScore ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Tests & CI */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">Tests & CI</h2>
                {view.ciRuns.length === 0 ? (
                    <p className="text-sm text-slate-500">No CI runs recorded in the last 30 days.</p>
                ) : (
                    <ul className="divide-y divide-slate-50 text-sm">
                        {view.ciRuns.slice(0, 15).map((r) => (
                            <li key={r.id} className="py-2 flex items-center gap-3">
                                <Badge variant={r.conclusion === 'success' ? 'default' : r.conclusion === 'failure' ? 'destructive' : 'secondary'}>
                                    {r.conclusion ?? r.status}
                                </Badge>
                                <span className="flex-1 text-slate-700">{r.name ?? 'workflow'}</span>
                                <span className="text-xs text-slate-400">
                                    {r.startedAt ? new Date(r.startedAt).toLocaleString() : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* AI & automation */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5" /> AI & Automation
                </h2>
                {view.agentEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No explicit AI-agent provenance detected. This does not mean AI was or
                        was not used — HEMS only records what GitHub metadata explicitly shows.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-50 text-sm">
                        {view.agentEvents.slice(0, 15).map((a) => (
                            <li key={a.id} className="py-2 flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="bg-blue-50 text-blue-800">{a.agentName ?? a.agentType}</Badge>
                                <span className="text-xs text-slate-500">
                                    {a.basis.replaceAll('_', ' ')} · {a.confidence}
                                </span>
                                <span className="text-xs text-slate-400 ml-auto">{new Date(a.createdAt).toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Anomalies */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5" /> Anomalies
                </h2>
                {view.anomalies.length === 0 ? (
                    <p className="text-sm text-slate-500">No anomalies recorded — no rule triggered.</p>
                ) : (
                    <ul className="space-y-3 text-sm">
                        {view.anomalies.map((a) => (
                            <li key={a.id} className="border border-slate-100 rounded-xl p-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={STATUS_STYLES[a.severity] ?? ''}>{a.severity}</Badge>
                                    <Badge variant="secondary">{a.ruleCode}</Badge>
                                    <span className="text-xs text-slate-400">status: {a.status}</span>
                                </div>
                                <p className="text-slate-700 mt-1">{a.reason}</p>
                                <p className="text-slate-600 text-xs mt-1">{a.explanation}</p>
                                {a.evidence.length > 0 && (
                                    <ul className="text-xs text-slate-500 mt-1 list-disc list-inside">
                                        {a.evidence.slice(0, 8).map((ev, i) => <li key={i}>{ev}</li>)}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Timeline */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-1">Work Timeline</h2>
                <p className="text-xs text-slate-400 mb-4">
                    Observed events only — gaps are gaps; HEMS does not claim continuous work.
                </p>
                {timeline.length === 0 ? (
                    <p className="text-sm text-slate-500">No timeline events yet.</p>
                ) : (
                    <ol className="relative border-l-2 border-slate-100 ml-3 space-y-3 max-h-128 overflow-y-auto">
                        {timeline.slice(0, 60).map((e, i) => (
                            <li key={`${e.sourceTable}-${e.sourceId}-${i}`} className="ml-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(e.time).toLocaleString([], {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                    <Badge variant="secondary" className="capitalize text-[10px]">
                                        {e.kind.replaceAll('_', ' ')}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-700">{e.description}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </Card>

            {/* Evidence trail (reports) */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-5 w-5" /> Daily Reports (audit trail)
                </h2>
                {view.reports.length === 0 ? (
                    <p className="text-sm text-slate-500">No daily reports generated yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-50 text-sm">
                        {view.reports.map((r) => (
                            <li key={r.id} className="py-2 flex items-center gap-3 flex-wrap">
                                <span className="text-xs text-slate-400 w-24">{r.date}</span>
                                <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ''}>
                                    {r.status.replaceAll('_', ' ')}
                                </Badge>
                                <span className="text-xs text-slate-500">{r.commits} commits · {r.prs} PRs</span>
                                <span className="text-xs text-slate-500 flex-1 min-w-0 truncate">{r.reason}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <p className="text-xs text-slate-400 flex items-center gap-1">
                <Bot className="h-3 w-3" />
                Bot commits are recorded transparently and are never attributed to the employee
                as manual work.
            </p>
        </div>
    )
}
