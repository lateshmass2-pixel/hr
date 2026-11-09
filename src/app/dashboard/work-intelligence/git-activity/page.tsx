import { getSession } from '@/lib/auth/session'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkIntelligenceNav } from '../nav'
import { GitBranch } from 'lucide-react'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// Git Activity — /dashboard/work-intelligence/git-activity
// =============================================================================
// Recent commits/pushes/PRs. Employees see their own; managers see org-wide.
// =============================================================================

export default async function GitActivityPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const supabase = await createClient()
    const adminSupabase = await createAdminClient()
    const isManager = isRoleAtLeast(session.role, 'manager')

    // Employees: restrict to their accounts.
    let accountFilter: string[] | null = null
    if (!isManager) {
        const { data: accounts } = await adminSupabase
            .from('git_accounts')
            .select('id')
            .eq('organization_id', session.organizationId)
            .eq('user_id', session.userId)
        accountFilter = (accounts ?? []).map((a: { id: string }) => a.id)
    }

    let commitQuery = supabase
        .from('git_commits')
        .select(`
            id, sha, message, committed_at, change_category, additions, deletions,
            is_bot, identity_source, url,
            git_repositories(full_name),
            git_accounts(github_username)
        `)
        .eq('organization_id', session.organizationId)
        .order('committed_at', { ascending: false })
        .limit(50)
    if (accountFilter) {
        commitQuery = accountFilter.length
            ? commitQuery.in('git_account_id', accountFilter)
            : commitQuery.eq('git_account_id', '00000000-0000-0000-0000-000000000000')
    }
    const { data: commits } = await commitQuery

    let prQuery = supabase
        .from('git_pull_requests')
        .select(`
            id, pr_number, title, state, gh_created_at, merged_at, url,
            author_username, author_is_bot,
            git_repositories(full_name)
        `)
        .eq('organization_id', session.organizationId)
        .order('gh_created_at', { ascending: false, nullsFirst: false })
        .limit(25)
    if (accountFilter) {
        prQuery = accountFilter.length
            ? prQuery.in('git_account_id', accountFilter)
            : prQuery.eq('git_account_id', '00000000-0000-0000-0000-000000000000')
    }
    const { data: prs } = await prQuery

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#0a3b2a] flex items-center gap-2">
                    <GitBranch className="h-6 w-6" /> Git Activity
                </h1>
                <WorkIntelligenceNav />
            </div>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">Recent Commits</h2>
                {!commits || commits.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                        No commits recorded yet. Connect GitHub under Settings → Integrations and
                        connect a repository, or wait for the scheduled sync.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 border-b">
                                    <th className="py-2 pr-3">When</th>
                                    <th className="py-2 pr-3">Commit</th>
                                    <th className="py-2 pr-3">Repository</th>
                                    <th className="py-2 pr-3">Author (GitHub)</th>
                                    <th className="py-2 pr-3">Category</th>
                                    <th className="py-2 pr-3">Changes</th>
                                    <th className="py-2">Identity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(commits as Array<{
                                    id: string
                                    sha: string
                                    message: string
                                    committed_at: string
                                    change_category: string | null
                                    additions: number
                                    deletions: number
                                    is_bot: boolean
                                    identity_source: string
                                    url: string | null
                                    git_repositories: { full_name: string } | { full_name: string }[] | null
                                    git_accounts: { github_username: string } | { github_username: string }[] | null
                                }>).map((c) => {
                                    const repo = Array.isArray(c.git_repositories)
                                        ? c.git_repositories[0]?.full_name
                                        : c.git_repositories?.full_name
                                    const author = Array.isArray(c.git_accounts)
                                        ? c.git_accounts[0]?.github_username
                                        : c.git_accounts?.github_username
                                    return (
                                        <tr key={c.id} className="align-top">
                                            <td className="py-2 pr-3 text-xs text-slate-400 whitespace-nowrap">
                                                {new Date(c.committed_at).toLocaleString([], {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {c.url ? (
                                                    <a href={c.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-700 hover:underline">
                                                        {c.sha.slice(0, 7)}
                                                    </a>
                                                ) : (
                                                    <span className="font-mono text-xs">{c.sha.slice(0, 7)}</span>
                                                )}
                                                <div className="text-slate-600 max-w-md">
                                                    {c.message.split('\n')[0].slice(0, 100)}
                                                </div>
                                            </td>
                                            <td className="py-2 pr-3 text-xs text-slate-500">{repo ?? '—'}</td>
                                            <td className="py-2 pr-3 text-xs">
                                                {c.is_bot ? <Badge variant="secondary">bot</Badge> : (author ?? 'unattributed')}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {c.change_category && (
                                                    <Badge variant="outline">{c.change_category}</Badge>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 text-xs text-slate-500">
                                                +{c.additions} / −{c.deletions}
                                            </td>
                                            <td className="py-2">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {c.identity_source.replaceAll('_', ' ')}
                                                </Badge>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">Recent Pull Requests</h2>
                {!prs || prs.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">No pull requests recorded yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {(prs as Array<{
                            id: string
                            pr_number: number
                            title: string
                            state: string
                            gh_created_at: string | null
                            merged_at: string | null
                            url: string | null
                            author_username: string | null
                            author_is_bot: boolean
                            git_repositories: { full_name: string } | { full_name: string }[] | null
                        }>).map((p) => {
                            const repo = Array.isArray(p.git_repositories)
                                ? p.git_repositories[0]?.full_name
                                : p.git_repositories?.full_name
                            return (
                                <li key={p.id} className="py-2 flex items-center gap-3 text-sm">
                                    <Badge variant="secondary" className="capitalize">{p.state}</Badge>
                                    <a href={p.url ?? '#'} target="_blank" rel="noreferrer" className="flex-1 text-[#0a3b2a] hover:underline">
                                        #{p.pr_number} {p.title.slice(0, 90)}
                                    </a>
                                    <span className="text-xs text-slate-500">{repo ?? ''}</span>
                                    <span className="text-xs text-slate-400">
                                        {p.author_is_bot ? 'bot' : (p.author_username ?? 'unknown')}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {p.gh_created_at ? new Date(p.gh_created_at).toLocaleDateString() : ''}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Card>
        </div>
    )
}
