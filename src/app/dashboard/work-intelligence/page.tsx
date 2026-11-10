import { getSession } from '@/lib/auth/session'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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
// employee roster with drill-down, open anomalies.
// Employees see only what THEY pushed into the code — not everyone's project commits.
// Managers see org-wide evidence.
// =============================================================================

export default async function WorkIntelligencePage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const supabase = await createClient()
    const adminSupabase = await createAdminClient()
    const isManager = isRoleAtLeast(session.role, 'manager')

    // ── Employee view: show only what the current user pushed into the code ────
    if (!isManager) {
        const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

        // 1. Resolve employee record for this user
        const { data: myEmployee } = await adminSupabase
            .from('org_employees')
            .select('id, full_name, position')
            .eq('organization_id', session.organizationId)
            .eq('user_id', session.userId)
            .maybeSingle()

        // 2. Resolve linked GitHub accounts
        const { data: myAccounts } = await adminSupabase
            .from('git_accounts')
            .select('id, github_username')
            .eq('organization_id', session.organizationId)
            .or(`user_id.eq.${session.userId}${myEmployee ? `,employee_id.eq.${myEmployee.id}` : ''}`)

        const accountIds = (myAccounts ?? []).map((a: { id: string }) => a.id)
        const githubUsernames = (myAccounts ?? [])
            .map((a: { github_username: string }) => a.github_username)
            .filter(Boolean)

        const hasIdentity = accountIds.length > 0 || githubUsernames.length > 0

        // Build identity match filters for commits and PRs
        const commitFilterParts: string[] = []
        if (accountIds.length > 0) {
            commitFilterParts.push(`git_account_id.in.(${accountIds.join(',')})`)
        }
        if (githubUsernames.length > 0) {
            commitFilterParts.push(`github_actor.in.(${githubUsernames.join(',')})`)
        }
        const commitFilter = commitFilterParts.length > 0 ? commitFilterParts.join(',') : null

        const prFilterParts: string[] = []
        if (accountIds.length > 0) {
            prFilterParts.push(`git_account_id.in.(${accountIds.join(',')})`)
        }
        if (githubUsernames.length > 0) {
            prFilterParts.push(`author_username.in.(${githubUsernames.join(',')})`)
        }
        const prFilter = prFilterParts.length > 0 ? prFilterParts.join(',') : null

        let commitCountQuery = supabase
            .from('git_commits')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', session.organizationId)
            .gte('committed_at', weekAgo)
        if (commitFilter) {
            commitCountQuery = commitCountQuery.or(commitFilter)
        } else {
            commitCountQuery = commitCountQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }

        let prCountQuery = supabase
            .from('git_pull_requests')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', session.organizationId)
            .gte('gh_created_at', weekAgo)
        if (prFilter) {
            prCountQuery = prCountQuery.or(prFilter)
        } else {
            prCountQuery = prCountQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }

        let recentCommitsQuery = supabase
            .from('git_commits')
            .select('id, sha, message, committed_at, change_category, additions, deletions, github_actor, url, git_repositories(full_name)')
            .eq('organization_id', session.organizationId)
            .order('committed_at', { ascending: false })
            .limit(10)
        if (commitFilter) {
            recentCommitsQuery = recentCommitsQuery.or(commitFilter)
        } else {
            recentCommitsQuery = recentCommitsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }

        const [myCommits, myPRs, myRecentCommits] = await Promise.all([
            commitCountQuery,
            prCountQuery,
            hasIdentity ? recentCommitsQuery : Promise.resolve({ data: [] }),
        ])

        const recentCommits = (myRecentCommits.data ?? []) as Array<{
            id: string
            sha: string
            message: string
            committed_at: string
            change_category: string | null
            additions: number
            deletions: number
            github_actor: string | null
            url: string | null
            git_repositories: { full_name: string } | { full_name: string }[] | null
        }>

        return (
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0a3b2a]">My Work Overview</h1>
                        <p className="text-sm text-[#14532d]/70">
                            Your personal code contributions — commits and pull requests you have pushed.
                        </p>
                    </div>
                    <WorkIntelligenceNav manager={false} />
                </div>

                {/* Personal metric cards */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <GitCommitHorizontal className="h-4 w-4" /> My Commits (7d)
                        </div>
                        <div className="text-3xl font-bold text-[#0a3b2a] mt-1">{myCommits.count ?? 0}</div>
                        <div className="text-xs text-slate-400">
                            {githubUsernames.length > 0
                                ? `@${githubUsernames.join(', @')}`
                                : 'No GitHub account connected'}
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <GitPullRequest className="h-4 w-4" /> My Pull Requests (7d)
                        </div>
                        <div className="text-3xl font-bold text-[#0a3b2a] mt-1">{myPRs.count ?? 0}</div>
                        <div className="text-xs text-slate-400">opened by you in the last 7 days</div>
                    </Card>
                </div>

                {/* Recent personal commits */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-4">
                        <GitCommitHorizontal className="h-5 w-5" /> My Recent Commits
                    </h2>
                    {!hasIdentity ? (
                        <p className="text-sm text-slate-500 py-4">
                            No GitHub account linked yet. Connect your GitHub account under{' '}
                            <Link href="/settings/integrations/github" className="text-blue-700 hover:underline">
                                Settings → Integrations
                            </Link>{' '}
                            to see your commits and activity here.
                        </p>
                    ) : recentCommits.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">No commits pushed by your account yet.</p>
                    ) : (
                        <ul className="divide-y divide-slate-50 space-y-0">
                            {recentCommits.map((c) => {
                                const repo = Array.isArray(c.git_repositories)
                                    ? c.git_repositories[0]?.full_name
                                    : c.git_repositories?.full_name
                                return (
                                    <li key={c.id} className="py-3 flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {c.url ? (
                                                    <a href={c.url} target="_blank" rel="noreferrer"
                                                        className="font-mono text-xs text-blue-700 hover:underline">
                                                        {c.sha.slice(0, 7)}
                                                    </a>
                                                ) : (
                                                    <span className="font-mono text-xs text-slate-400">{c.sha.slice(0, 7)}</span>
                                                )}
                                                {c.change_category && (
                                                    <Badge variant="outline" className="text-[10px]">{c.change_category}</Badge>
                                                )}
                                                <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
                                                    {new Date(c.committed_at).toLocaleString([], {
                                                        month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-700 mt-0.5">
                                                {c.message.split('\n')[0].slice(0, 100)}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {repo ?? '—'}{' '}
                                                <span className="text-emerald-600">+{c.additions}</span>{' '}
                                                <span className="text-red-500">−{c.deletions}</span>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                    {recentCommits.length > 0 && (
                        <div className="mt-4 pt-3 border-t">
                            <Link href="/dashboard/work-intelligence/git-activity"
                                className="text-sm text-blue-700 hover:underline">
                                View all your git activity →
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        )
    }

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
