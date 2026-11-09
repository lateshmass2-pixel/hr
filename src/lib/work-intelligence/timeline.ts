// =============================================================================
// Work Intelligence — Timeline Engine (spec §14)
// =============================================================================
// Builds evidence-based employee development timelines from recorded data.
// IMPORTANT SEMANTICS: the timeline shows observed events only. It NEVER
// claims continuous work between events — every consumer renders gaps as
// gaps. Times are event timestamps from GitHub, not "work sessions".
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TimelineEntry } from './types';

export interface TimelineQuery {
    organizationId: string;
    employeeId?: string;
    /** git_account ids — derived from employeeId when given */
    gitAccountIds?: string[];
    from?: string;   // ISO date
    to?: string;     // ISO date
    limit?: number;
}

interface CommitRow {
    id: string;
    sha: string;
    message: string;
    committed_at: string;
    change_category: string | null;
    additions: number;
    deletions: number;
    is_bot: boolean;
    git_account_id: string | null;
    repository_id: string;
    git_repositories?: { full_name: string } | null;
}
interface PushRow {
    id: string;
    pushed_at: string;
    branch: string;
    is_bot: boolean;
    git_account_id: string | null;
    repository_id: string;
    git_repositories?: { full_name: string } | null;
}
interface PrRow {
    id: string;
    pr_number: number;
    title: string;
    state: string;
    gh_created_at: string | null;
    merged_at: string | null;
    git_account_id: string | null;
    repository_id: string;
    git_repositories?: { full_name: string } | null;
}
interface ReviewRow {
    id: string;
    state: string;
    submitted_at: string | null;
    git_account_id: string | null;
}
interface RunRow {
    id: string;
    name: string | null;
    status: string;
    conclusion: string | null;
    run_started_at: string | null;
    run_completed_at: string | null;
    git_account_id: string | null;
}
interface AnomalyRow {
    id: string;
    severity: string;
    reason: string;
    detected_at: string;
}
interface BranchRow {
    id: string;
    name: string;
    first_seen_at: string;
    git_account_id?: never;
}

function repoName(row: { git_repositories?: { full_name: string } | null }): string {
    const r = row.git_repositories;
    if (Array.isArray(r)) return (r[0] as { full_name: string })?.full_name ?? 'repository';
    return r?.full_name ?? 'repository';
}

/**
 * Fetch a merged, chronologically-sorted timeline. Each entry cites its
 * source table + row id so the UI can drill into raw evidence.
 */
export async function buildTimeline(
    supabase: SupabaseClient,
    query: TimelineQuery
): Promise<TimelineEntry[]> {
    const limit = Math.min(query.limit ?? 200, 500);

    const accountFilter = (q: { eq: (c: string, v: string) => unknown }) => {
        if (query.gitAccountIds && query.gitAccountIds.length > 0) {
            return q.eq('git_account_id', query.gitAccountIds[0]);
        }
        return q;
    };
    void accountFilter;

    // Resolve account ids for the employee when needed
    let accountIds: string[] = query.gitAccountIds ?? [];
    if (query.employeeId && accountIds.length === 0) {
        const { data } = await supabase
            .from('git_accounts')
            .select('id')
            .eq('organization_id', query.organizationId)
            .eq('employee_id', query.employeeId);
        accountIds = (data ?? []).map((r: { id: string }) => r.id);
        if (accountIds.length === 0) {
            // No connected accounts → no git timeline (may still have anomalies)
        }
    }

    const entries: TimelineEntry[] = [];

    // --- Commits -----------------------------------------------------------
    let commitQ = supabase
        .from('git_commits')
        .select('id, sha, message, committed_at, change_category, additions, deletions, is_bot, git_account_id, repository_id, git_repositories(full_name)')
        .eq('organization_id', query.organizationId)
        .order('committed_at', { ascending: false })
        .limit(limit);
    if (accountIds.length > 0) commitQ = commitQ.in('git_account_id', accountIds);
    if (query.from) commitQ = commitQ.gte('committed_at', query.from);
    if (query.to) commitQ = commitQ.lte('committed_at', query.to);
    const { data: commits } = await commitQ;
    for (const c of (commits ?? []) as unknown as CommitRow[]) {
        entries.push({
            time: c.committed_at,
            kind: 'commit',
            description:
                `${c.is_bot ? '[bot] ' : ''}commit ${c.sha.slice(0, 7)} — ` +
                `${c.message.split('\n')[0].slice(0, 90)}` +
                `${c.change_category ? ` (${c.change_category.toLowerCase()})` : ''}`,
            sourceTable: 'git_commits',
            sourceId: c.id,
            meta: {
                repository: repoName(c as never),
                additions: c.additions,
                deletions: c.deletions,
                sha: c.sha,
            },
        });
    }

    // --- Pushes ------------------------------------------------------------
    let pushQ = supabase
        .from('git_push_events')
        .select('id, pushed_at, branch, is_bot, git_account_id, repository_id, git_repositories(full_name)')
        .eq('organization_id', query.organizationId)
        .order('pushed_at', { ascending: false })
        .limit(limit);
    if (accountIds.length > 0) pushQ = pushQ.in('git_account_id', accountIds);
    if (query.from) pushQ = pushQ.gte('pushed_at', query.from);
    if (query.to) pushQ = pushQ.lte('pushed_at', query.to);
    const { data: pushes } = await pushQ;
    for (const p of (pushes ?? []) as unknown as PushRow[]) {
        entries.push({
            time: p.pushed_at,
            kind: 'push',
            description: `push to ${p.branch} on ${repoName(p as never)}`,
            sourceTable: 'git_push_events',
            sourceId: p.id,
            meta: { branch: p.branch, repository: repoName(p as never), isBot: p.is_bot },
        });
    }

    // --- Pull requests -----------------------------------------------------
    let prQ = supabase
        .from('git_pull_requests')
        .select('id, pr_number, title, state, gh_created_at, merged_at, git_account_id, repository_id, git_repositories(full_name)')
        .eq('organization_id', query.organizationId)
        .order('gh_created_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    if (accountIds.length > 0) prQ = prQ.in('git_account_id', accountIds);
    if (query.from) prQ = prQ.gte('gh_created_at', query.from);
    if (query.to) prQ = prQ.lte('gh_created_at', query.to);
    const { data: prs } = await prQ;
    for (const pr of (prs ?? []) as unknown as PrRow[]) {
        if (pr.gh_created_at) {
            entries.push({
                time: pr.gh_created_at,
                kind: 'pr_opened',
                description: `PR #${pr.pr_number} opened — ${pr.title.slice(0, 80)}`,
                sourceTable: 'git_pull_requests',
                sourceId: pr.id,
                meta: { repository: repoName(pr as never) },
            });
        }
        if (pr.merged_at) {
            entries.push({
                time: pr.merged_at,
                kind: 'pr_merged',
                description: `PR #${pr.pr_number} merged — ${pr.title.slice(0, 80)}`,
                sourceTable: 'git_pull_requests',
                sourceId: pr.id,
                meta: { repository: repoName(pr as never) },
            });
        }
    }

    // --- Reviews -----------------------------------------------------------
    let reviewQ = supabase
        .from('git_pull_request_reviews')
        .select('id, state, submitted_at, git_account_id')
        .eq('organization_id', query.organizationId)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    if (accountIds.length > 0) reviewQ = reviewQ.in('git_account_id', accountIds);
    const { data: reviews } = await reviewQ;
    for (const r of (reviews ?? []) as unknown as ReviewRow[]) {
        if (!r.submitted_at) continue;
        entries.push({
            time: r.submitted_at,
            kind: 'review',
            description: `review submitted (${r.state})`,
            sourceTable: 'git_pull_request_reviews',
            sourceId: r.id,
        });
    }

    // --- CI runs -----------------------------------------------------------
    let runQ = supabase
        .from('git_workflow_runs')
        .select('id, name, status, conclusion, run_started_at, run_completed_at, git_account_id')
        .eq('organization_id', query.organizationId)
        .order('run_started_at', { ascending: false, nullsFirst: false })
        .limit(limit);
    if (accountIds.length > 0) runQ = runQ.in('git_account_id', accountIds);
    const { data: runs } = await runQ;
    for (const r of (runs ?? []) as unknown as RunRow[]) {
        if (r.run_started_at) {
            entries.push({
                time: r.run_started_at,
                kind: r.conclusion ? 'ci_completed' : 'ci_started',
                description:
                    `CI ${r.name ?? 'workflow'} ${r.status}` +
                    (r.conclusion ? ` → ${r.conclusion}` : ''),
                sourceTable: 'git_workflow_runs',
                sourceId: r.id,
                meta: { conclusion: r.conclusion },
            });
        }
    }

    // --- Anomalies ---------------------------------------------------------
    if (query.employeeId) {
        const { data: anomalies } = await supabase
            .from('activity_anomalies')
            .select('id, severity, reason, detected_at')
            .eq('organization_id', query.organizationId)
            .eq('employee_id', query.employeeId)
            .order('detected_at', { ascending: false })
            .limit(50);
        for (const a of (anomalies ?? []) as unknown as AnomalyRow[]) {
            entries.push({
                time: a.detected_at,
                kind: 'anomaly',
                description: `[${a.severity}] ${a.reason}`,
                sourceTable: 'activity_anomalies',
                sourceId: a.id,
            });
        }
    }

    // Sort newest-first, cap
    entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return entries.slice(0, limit);
}

/**
 * Daily activity boundary for the timeline header: first/last observed event.
 * Explicitly named "observed" — not "started/finished working".
 */
export async function dailyActivityBounds(
    supabase: SupabaseClient,
    organizationId: string,
    employeeId: string,
    date: string   // YYYY-MM-DD
): Promise<{ firstActivityAt: string | null; lastActivityAt: string | null }> {
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data } = await supabase
        .from('git_accounts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId);
    const accountIds = (data ?? []).map((r: { id: string }) => r.id);
    if (accountIds.length === 0) return { firstActivityAt: null, lastActivityAt: null };

    const { data: commits } = await supabase
        .from('git_commits')
        .select('committed_at')
        .in('git_account_id', accountIds)
        .gte('committed_at', dayStart)
        .lte('committed_at', dayEnd)
        .order('committed_at', { ascending: true });
    if (!commits || commits.length === 0) {
        return { firstActivityAt: null, lastActivityAt: null };
    }
    return {
        firstActivityAt: (commits[0] as { committed_at: string }).committed_at,
        lastActivityAt: (commits[commits.length - 1] as { committed_at: string }).committed_at,
    };
}
