// =============================================================================
// Work Intelligence — Dashboard / Detail Queries
// =============================================================================
// Read-side queries powering the dashboards and employee detail pages.
// All queries are org-scoped and respect the RLS policies from migration 008
// (read path runs with the user's session client; the admin client is used
// only where explicitly noted).
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Overview (dashboard landing)
// ---------------------------------------------------------------------------

export interface WorkIntelligenceOverview {
    connectedAccounts: number;
    connectedRepositories: number;
    commitsLast7Days: number;
    prsLast7Days: number;
    reviewsLast7Days: number;
    ciRunsLast7Days: number;
    openAnomalies: number;
    reviewRequiredReports: number;
    verifiedReports: number;
    insufficientEvidenceReports: number;
    agentEventsCount: number;
    automationEventsCount: number;
    employeesWithAccounts: number;
}

export async function getWorkIntelligenceOverview(
    supabase: SupabaseClient,
    organizationId: string,
    now = new Date()
): Promise<WorkIntelligenceOverview> {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

    const [
        accounts,
        repos,
        commits,
        prs,
        reviews,
        runs,
        anomalies,
        reportsByStatus,
        agentEvents,
        automationEvents,
        employeesWithAccounts,
    ] = await Promise.all([
        supabase.from('git_accounts')
            .select('employee_id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),
        supabase.from('git_repositories')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('is_active', true),
        supabase.from('git_commits')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('committed_at', weekAgo),
        supabase.from('git_pull_requests')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('gh_created_at', weekAgo),
        supabase.from('git_pull_request_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('submitted_at', weekAgo),
        supabase.from('git_workflow_runs')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .gte('run_started_at', weekAgo),
        supabase.from('activity_anomalies')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'open')
            .neq('severity', 'NORMAL'),
        supabase.from('daily_work_reports')
            .select('authenticity_status')
            .eq('organization_id', organizationId)
            .gte('report_date', new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)),
        supabase.from('agent_events')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),
        supabase.from('automation_events')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId),
        supabase.from('git_accounts')
            .select('employee_id')
            .eq('organization_id', organizationId)
            .not('employee_id', 'is', null),
    ]);

    const statuses = (reportsByStatus.data ?? []) as Array<{ authenticity_status: string }>;
    return {
        connectedAccounts: accounts.count ?? 0,
        connectedRepositories: repos.count ?? 0,
        commitsLast7Days: commits.count ?? 0,
        prsLast7Days: prs.count ?? 0,
        reviewsLast7Days: reviews.count ?? 0,
        ciRunsLast7Days: runs.count ?? 0,
        openAnomalies: anomalies.count ?? 0,
        reviewRequiredReports: statuses.filter((s) => s.authenticity_status === 'REVIEW_REQUIRED').length,
        verifiedReports: statuses.filter((s) => s.authenticity_status === 'VERIFIED').length,
        insufficientEvidenceReports: statuses.filter((s) => s.authenticity_status === 'INSUFFICIENT_EVIDENCE').length,
        agentEventsCount: agentEvents.count ?? 0,
        automationEventsCount: automationEvents.count ?? 0,
        employeesWithAccounts: new Set(
            (employeesWithAccounts.data ?? [])
                .map((r: { employee_id: string | null }) => r.employee_id)
                .filter((x): x is string => Boolean(x))
        ).size,
    };
}

// ---------------------------------------------------------------------------
// Employee roster with git stats (Employees tab)
// ---------------------------------------------------------------------------

export interface EmployeeGitSummaryRow {
    employeeId: string;
    fullName: string;
    position: string | null;
    department: string | null;
    avatarUrl: string | null;
    githubUsernames: string[];
    accountsConnected: number;
    commits7d: number;
    prs7d: number;
    lastReportStatus: string | null;
    lastReportDate: string | null;
}

export async function getEmployeeGitSummaries(
    supabase: SupabaseClient,
    organizationId: string
): Promise<EmployeeGitSummaryRow[]> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [employees, accounts, commitCounts, prCounts, lastReports] = await Promise.all([
        supabase.from('org_employees')
            .select('id, full_name, position, department, avatar_url, status')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('full_name'),
        supabase.from('git_accounts')
            .select('id, employee_id, github_username')
            .eq('organization_id', organizationId),
        // Commits in last 7d per account
        supabase.from('git_commits')
            .select('git_account_id')
            .eq('organization_id', organizationId)
            .gte('committed_at', weekAgo)
            .not('git_account_id', 'is', null),
        supabase.from('git_pull_requests')
            .select('git_account_id')
            .eq('organization_id', organizationId)
            .gte('gh_created_at', weekAgo)
            .not('git_account_id', 'is', null),
        supabase.from('daily_work_reports')
            .select('employee_id, authenticity_status, report_date')
            .eq('organization_id', organizationId)
            .order('report_date', { ascending: false })
    ]);

    const commitsByAccount = new Map<string, number>();
    for (const c of (commitCounts.data ?? []) as Array<{ git_account_id: string | null }>) {
        if (c.git_account_id) {
            commitsByAccount.set(c.git_account_id, (commitsByAccount.get(c.git_account_id) ?? 0) + 1);
        }
    }
    const prsByAccount = new Map<string, number>();
    for (const p of (prCounts.data ?? []) as Array<{ git_account_id: string | null }>) {
        if (p.git_account_id) {
            prsByAccount.set(p.git_account_id, (prsByAccount.get(p.git_account_id) ?? 0) + 1);
        }
    }
    const accountsByEmployee = new Map<string, { username: string; id: string }[]>();
    for (const a of (accounts.data ?? []) as Array<{ id: string; employee_id: string | null; github_username: string }>) {
        if (a.employee_id) {
            const list = accountsByEmployee.get(a.employee_id) ?? [];
            list.push({ username: a.github_username, id: a.id });
            accountsByEmployee.set(a.employee_id, list);
        }
    }
    const lastReportByEmployee = new Map<string, { status: string; date: string }>();
    for (const r of (lastReports.data ?? []) as Array<{ employee_id: string; authenticity_status: string; report_date: string }>) {
        if (!lastReportByEmployee.has(r.employee_id)) {
            lastReportByEmployee.set(r.employee_id, { status: r.authenticity_status, date: r.report_date });
        }
    }

    return ((employees.data ?? []) as Array<{
        id: string; full_name: string; position: string | null;
        department: string | null; avatar_url: string | null;
    }>).map((e) => {
        const accs = accountsByEmployee.get(e.id) ?? [];
        const commits7d = accs.reduce((sum, a) => sum + (commitsByAccount.get(a.id) ?? 0), 0);
        const prs7d = accs.reduce((sum, a) => sum + (prsByAccount.get(a.id) ?? 0), 0);
        const lastReport = lastReportByEmployee.get(e.id) ?? null;
        return {
            employeeId: e.id,
            fullName: e.full_name,
            position: e.position,
            department: e.department,
            avatarUrl: e.avatar_url,
            githubUsernames: accs.map((a) => a.username),
            accountsConnected: accs.length,
            commits7d,
            prs7d,
            lastReportStatus: lastReport?.status ?? null,
            lastReportDate: lastReport?.date ?? null,
        };
    });
}

// ---------------------------------------------------------------------------
// Today's activity feed (org-wide, manager+)
// ---------------------------------------------------------------------------

export interface ActivityFeedRow {
    id: string;
    kind: 'commit' | 'push' | 'pr' | 'review' | 'ci' | 'anomaly';
    time: string;
    actor: string | null;
    repository: string | null;
    description: string;
    url: string | null;
}

export async function getTodayActivityFeed(
    supabase: SupabaseClient,
    organizationId: string,
    limit = 50
): Promise<ActivityFeedRow[]> {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [commits, prs, reviews, runs, anomalies] = await Promise.all([
        supabase.from('git_commits')
            .select('id, sha, message, committed_at, github_actor, is_bot, url, git_repositories(full_name)')
            .eq('organization_id', organizationId)
            .gte('committed_at', dayStart.toISOString())
            .order('committed_at', { ascending: false })
            .limit(limit),
        supabase.from('git_pull_requests')
            .select('id, pr_number, title, gh_created_at, author_username, url, git_repositories(full_name)')
            .eq('organization_id', organizationId)
            .gte('gh_created_at', dayStart.toISOString())
            .order('gh_created_at', { ascending: false, nullsFirst: false })
            .limit(limit),
        supabase.from('git_pull_request_reviews')
            .select('id, state, submitted_at, reviewer_username')
            .eq('organization_id', organizationId)
            .gte('submitted_at', dayStart.toISOString())
            .order('submitted_at', { ascending: false, nullsFirst: false })
            .limit(limit),
        supabase.from('git_workflow_runs')
            .select('id, name, status, conclusion, run_started_at, actor_username, html_url')
            .eq('organization_id', organizationId)
            .gte('run_started_at', dayStart.toISOString())
            .order('run_started_at', { ascending: false, nullsFirst: false })
            .limit(limit),
        supabase.from('activity_anomalies')
            .select('id, severity, reason, detected_at')
            .eq('organization_id', organizationId)
            .gte('detected_at', dayStart.toISOString())
            .order('detected_at', { ascending: false })
            .limit(limit),
    ]);

    const rows: ActivityFeedRow[] = [];

    for (const c of (commits.data ?? []) as Array<{
        id: string; sha: string; message: string; committed_at: string;
        github_actor: string | null; is_bot: boolean; url: string | null;
        git_repositories: { full_name: string } | { full_name: string }[] | null;
    }>) {
        rows.push({
            id: c.id,
            kind: 'commit',
            time: c.committed_at,
            actor: c.github_actor,
            repository: firstRepo(c.git_repositories),
            description: `${c.is_bot ? '[bot] ' : ''}${c.message.split('\n')[0].slice(0, 100)}`,
            url: c.url,
        });
    }
    for (const p of (prs.data ?? []) as Array<{
        id: string; pr_number: number; title: string; gh_created_at: string;
        author_username: string | null; url: string | null;
        git_repositories: { full_name: string } | { full_name: string }[] | null;
    }>) {
        rows.push({
            id: p.id,
            kind: 'pr',
            time: p.gh_created_at,
            actor: p.author_username,
            repository: firstRepo(p.git_repositories),
            description: `PR #${p.pr_number}: ${p.title.slice(0, 100)}`,
            url: p.url,
        });
    }
    for (const r of (reviews.data ?? []) as Array<{
        id: string; state: string; submitted_at: string; reviewer_username: string | null;
    }>) {
        rows.push({
            id: r.id,
            kind: 'review',
            time: r.submitted_at,
            actor: r.reviewer_username,
            repository: null,
            description: `Review (${r.state})`,
            url: null,
        });
    }
    for (const r of (runs.data ?? []) as Array<{
        id: string; name: string | null; status: string; conclusion: string | null;
        run_started_at: string; actor_username: string | null; html_url: string | null;
    }>) {
        rows.push({
            id: r.id,
            kind: 'ci',
            time: r.run_started_at,
            actor: r.actor_username,
            repository: null,
            description: `CI: ${r.name ?? 'workflow'} — ${r.status}${r.conclusion ? ` (${r.conclusion})` : ''}`,
            url: r.html_url,
        });
    }
    for (const a of (anomalies.data ?? []) as Array<{
        id: string; severity: string; reason: string; detected_at: string;
    }>) {
        rows.push({
            id: a.id,
            kind: 'anomaly',
            time: a.detected_at,
            actor: null,
            repository: null,
            description: `[${a.severity}] ${a.reason}`,
            url: null,
        });
    }

    rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return rows.slice(0, limit);
}

function firstRepo(
    r: { full_name: string } | { full_name: string }[] | null
): string | null {
    if (!r) return null;
    if (Array.isArray(r)) return r[0]?.full_name ?? null;
    return r.full_name;
}

// ---------------------------------------------------------------------------
// Evidence drill-down (employee + day)
// ---------------------------------------------------------------------------

export interface EmployeeEvidenceView {
    employee: {
        id: string;
        fullName: string;
        position: string | null;
        avatarUrl: string | null;
    } | null;
    accounts: Array<{
        id: string;
        githubUsername: string;
        displayName: string | null;
        avatarUrl: string | null;
        status: string;
        identitySource: string;
        connectedAt: string;
        lastSyncedAt: string | null;
        isBot: boolean;
    }>;
    commits: Array<{
        id: string;
        sha: string;
        message: string;
        committedAt: string;
        repository: string | null;
        category: string | null;
        additions: number;
        deletions: number;
        isBot: boolean;
        identitySource: string;
        url: string | null;
        meaningfulScore: number | null;
    }>;
    pushes: Array<{
        id: string;
        branch: string;
        pushedAt: string;
        actor: string | null;
        repository: string | null;
        isBot: boolean;
        commitCount: number;
    }>;
    pullRequests: Array<{
        id: string;
        number: number;
        title: string;
        state: string;
        repository: string | null;
        createdAt: string | null;
        mergedAt: string | null;
        url: string | null;
    }>;
    reviews: Array<{
        id: string;
        state: string;
        submittedAt: string | null;
        prTitle: string | null;
    }>;
    ciRuns: Array<{
        id: string;
        name: string | null;
        status: string;
        conclusion: string | null;
        startedAt: string | null;
    }>;
    agentEvents: Array<{
        id: string;
        agentType: string;
        agentName: string | null;
        basis: string;
        confidence: string;
        createdAt: string;
    }>;
    anomalies: Array<{
        id: string;
        severity: string;
        ruleCode: string;
        reason: string;
        explanation: string;
        evidence: string[];
        status: string;
        detectedAt: string;
    }>;
    taskLinks: Array<{
        id: string;
        taskId: string;
        taskTitle: string | null;
        basis: string | null;
        commitId: string | null;
        prId: string | null;
        branchName: string | null;
    }>;
    reports: Array<{
        id: string;
        date: string;
        status: string;
        reason: string;
        commits: number;
        prs: number;
    }>;
}

export async function getEmployeeEvidenceView(
    supabase: SupabaseClient,
    organizationId: string,
    employeeId: string,
    options: { days?: number } = {}
): Promise<EmployeeEvidenceView> {
    const days = options.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    const [employee, accounts] = await Promise.all([
        supabase.from('org_employees')
            .select('id, full_name, position, avatar_url')
            .eq('organization_id', organizationId)
            .eq('id', employeeId)
            .maybeSingle(),
        supabase.from('git_accounts')
            .select('id, github_username, display_name, avatar_url, status, identity_source, connected_at, last_synced_at, is_bot')
            .eq('organization_id', organizationId)
            .eq('employee_id', employeeId),
    ]);

    const accountIds = ((accounts.data ?? []) as Array<{ id: string }>).map((a) => a.id);

    // Commits first — later queries filter by their ids.
    const commitsRes = accountIds.length
        ? await supabase.from('git_commits')
            .select('id, sha, message, committed_at, change_category, additions, deletions, is_bot, identity_source, url, meaningful_score, git_repositories(full_name)')
            .in('git_account_id', accountIds)
            .gte('committed_at', since)
            .order('committed_at', { ascending: false })
            .limit(200)
        : { data: [] as Array<Record<string, unknown>> };
    const commitIdList = ((commitsRes.data ?? []) as Array<{ id: string }>).map((c) => c.id);
    const commitIdFilter = commitIdList.length ? commitIdList : ['00000000-0000-0000-0000-000000000000'];

    const [pushes, prs, reviews, runs, agentEvents, anomalies, taskLinks, reports] = await Promise.all([
        accountIds.length
            ? supabase.from('git_push_events')
                .select('id, branch, pushed_at, github_actor, is_bot, commit_shas, git_repositories(full_name)')
                .in('git_account_id', accountIds)
                .gte('pushed_at', since)
                .order('pushed_at', { ascending: false })
                .limit(100)
            : Promise.resolve({ data: [] }),
        accountIds.length
            ? supabase.from('git_pull_requests')
                .select('id, pr_number, title, state, gh_created_at, merged_at, url, git_repositories(full_name)')
                .in('git_account_id', accountIds)
                .order('gh_created_at', { ascending: false, nullsFirst: false })
                .limit(50)
            : Promise.resolve({ data: [] }),
        accountIds.length
            ? supabase.from('git_pull_request_reviews')
                .select('id, state, submitted_at, git_pull_requests(title)')
                .in('git_account_id', accountIds)
                .order('submitted_at', { ascending: false, nullsFirst: false })
                .limit(50)
            : Promise.resolve({ data: [] }),
        accountIds.length
            ? supabase.from('git_workflow_runs')
                .select('id, name, status, conclusion, run_started_at')
                .in('git_account_id', accountIds)
                .gte('run_started_at', since)
                .order('run_started_at', { ascending: false, nullsFirst: false })
                .limit(50)
            : Promise.resolve({ data: [] }),
        supabase.from('agent_events')
            .select('id, agent_type, agent_name, detection_basis, confidence, created_at')
            .eq('organization_id', organizationId)
            .in('commit_id', commitIdFilter)
            .order('created_at', { ascending: false })
            .limit(100),
        supabase.from('activity_anomalies')
            .select('id, severity, rule_code, reason, explanation, evidence, status, detected_at')
            .eq('organization_id', organizationId)
            .eq('employee_id', employeeId)
            .order('detected_at', { ascending: false })
            .limit(50),
        supabase.from('task_git_links')
            .select('id, task_id, correlation_basis, commit_id, pull_request_id, branch_name, org_tasks(title)')
            .eq('organization_id', organizationId)
            .in('commit_id', commitIdFilter)
            .limit(200),
        supabase.from('daily_work_reports')
            .select('id, report_date, authenticity_status, status_reason, commit_count, pr_count')
            .eq('organization_id', organizationId)
            .eq('employee_id', employeeId)
            .order('report_date', { ascending: false })
            .limit(30),
    ]);

    return {
        employee: employee.data
            ? {
                id: (employee.data as { id: string }).id,
                fullName: (employee.data as { full_name: string }).full_name,
                position: (employee.data as { position: string | null }).position,
                avatarUrl: (employee.data as { avatar_url: string | null }).avatar_url,
            }
            : null,
        accounts: ((accounts.data ?? []) as Array<{
            id: string; github_username: string; display_name: string | null;
            avatar_url: string | null; status: string; identity_source: string;
            connected_at: string; last_synced_at: string | null; is_bot: boolean;
        }>).map((a) => ({
            id: a.id,
            githubUsername: a.github_username,
            displayName: a.display_name,
            avatarUrl: a.avatar_url,
            status: a.status,
            identitySource: a.identity_source,
            connectedAt: a.connected_at,
            lastSyncedAt: a.last_synced_at,
            isBot: a.is_bot,
        })),
        commits: ((commitsRes.data ?? []) as Array<{
            id: string; sha: string; message: string; committed_at: string;
            change_category: string | null; additions: number; deletions: number;
            is_bot: boolean; identity_source: string; url: string | null;
            meaningful_score: number | null;
            git_repositories?: { full_name: string } | { full_name: string }[] | null;
        }>).map((c) => ({
            id: c.id,
            sha: c.sha,
            message: c.message,
            committedAt: c.committed_at,
            repository: firstRepo((c.git_repositories ?? null) as never),
            category: c.change_category,
            additions: c.additions,
            deletions: c.deletions,
            isBot: c.is_bot,
            identitySource: c.identity_source,
            url: c.url,
            meaningfulScore: c.meaningful_score,
        })),
        pushes: ((pushes.data ?? []) as Array<{
            id: string; branch: string; pushed_at: string; github_actor: string | null;
            is_bot: boolean; commit_shas: string[] | null;
            git_repositories?: { full_name: string } | { full_name: string }[] | null;
        }>).map((p) => ({
            id: p.id,
            branch: p.branch,
            pushedAt: p.pushed_at,
            actor: p.github_actor,
            repository: firstRepo((p.git_repositories ?? null) as never),
            isBot: p.is_bot,
            commitCount: (p.commit_shas ?? []).length,
        })),
        pullRequests: ((prs.data ?? []) as Array<{
            id: string; pr_number: number; title: string; state: string;
            gh_created_at: string | null; merged_at: string | null; url: string | null;
            git_repositories?: { full_name: string } | { full_name: string }[] | null;
        }>).map((p) => ({
            id: p.id,
            number: p.pr_number,
            title: p.title,
            state: p.state,
            repository: firstRepo((p.git_repositories ?? null) as never),
            createdAt: p.gh_created_at,
            mergedAt: p.merged_at,
            url: p.url,
        })),
        reviews: ((reviews.data ?? []) as unknown as Array<{
            id: string; state: string; submitted_at: string | null;
            git_pull_requests?: { title: string } | { title: string }[] | null;
        }>).map((r) => ({
            id: r.id,
            state: r.state,
            submittedAt: r.submitted_at,
            prTitle: firstRepoTitle(r.git_pull_requests),
        })),
        ciRuns: ((runs.data ?? []) as Array<{
            id: string; name: string | null; status: string;
            conclusion: string | null; run_started_at: string | null;
        }>).map((r) => ({
            id: r.id,
            name: r.name,
            status: r.status,
            conclusion: r.conclusion,
            startedAt: r.run_started_at,
        })),
        agentEvents: ((agentEvents.data ?? []) as Array<{
            id: string; agent_type: string; agent_name: string | null;
            detection_basis: string; confidence: string; created_at: string;
        }>).map((a) => ({
            id: a.id,
            agentType: a.agent_type,
            agentName: a.agent_name,
            basis: a.detection_basis,
            confidence: a.confidence,
            createdAt: a.created_at,
        })),
        anomalies: ((anomalies.data ?? []) as Array<{
            id: string; severity: string; rule_code: string; reason: string;
            explanation: string; evidence: unknown; status: string; detected_at: string;
        }>).map((a) => ({
            id: a.id,
            severity: a.severity,
            ruleCode: a.rule_code,
            reason: a.reason,
            explanation: a.explanation,
            evidence: Array.isArray(a.evidence) ? (a.evidence as string[]) : [],
            status: a.status,
            detectedAt: a.detected_at,
        })),
        taskLinks: ((taskLinks.data ?? []) as Array<{
            id: string; task_id: string; correlation_basis: string | null;
            commit_id: string | null; pull_request_id: string | null;
            branch_name: string | null; org_tasks?: { title: string } | { title: string }[] | null;
        }>).map((t) => ({
            id: t.id,
            taskId: t.task_id,
            taskTitle: firstRepoTitle(t.org_tasks),
            basis: t.correlation_basis,
            commitId: t.commit_id,
            prId: t.pull_request_id,
            branchName: t.branch_name,
        })),
        reports: ((reports.data ?? []) as Array<{
            id: string; report_date: string; authenticity_status: string;
            status_reason: string; commit_count: number; pr_count: number;
        }>).map((r) => ({
            id: r.id,
            date: r.report_date,
            status: r.authenticity_status,
            reason: r.status_reason,
            commits: r.commit_count,
            prs: r.pr_count,
        })),
    };
}

function firstRepoTitle(
    r: { title: string } | { title: string }[] | null | undefined
): string | null {
    if (!r) return null;
    if (Array.isArray(r)) return r[0]?.title ?? null;
    return r.title;
}
