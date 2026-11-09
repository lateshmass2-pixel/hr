// =============================================================================
// Work Intelligence — Daily Work Reports Engine (spec §17, §20)
// =============================================================================
// Generates per-employee daily reports from recorded evidence ONLY:
//   * aggregates the day's git activity
//   * runs the anomaly engine over the day's commits
//   * computes the evidence checklist (each check cites records)
//   * derives the authenticity status + human-readable reason
//
// The report explains WHY the status was produced, in evidence-based
// language. It never asserts misconduct or authorship of individual lines.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeAnomalies, anomaliesToStatus, ANOMALY_RULE_VERSION } from './anomaly';
import type {
    AnomalyRecord,
    AnomalyThresholds,
    AuthenticityStatus,
    DailyAutomationSummary,
    DailyEvidenceChecklist,
    EvidenceFact,
} from './types';
import type { DiffSummary } from './diff-analyzer';
import { summarizeDiff } from './diff-analyzer';

const DEFAULT_THRESHOLDS: AnomalyThresholds = {
    commit_burst_window_minutes: 15,
    commit_burst_threshold: 20,
    tiny_commit_threshold: 3,
    generated_file_ratio: 0.8,
};

export interface DailyReportInput {
    organizationId: string;
    employeeId: string;
    /** YYYY-MM-DD */
    date: string;
    /** Force regeneration even if a report exists */
    force?: boolean;
    /** AI summary text (produced separately by ai-summary, may be null) */
    aiSummary?: string | null;
}

export interface DailyReportResult {
    status: AuthenticityStatus;
    reason: string;
    counts: {
        repositories: number;
        commits: number;
        pushes: number;
        pullRequests: number;
        reviews: number;
        ciRuns: number;
        filesChanged: number;
    };
    workAreas: string[];
    checklist: DailyEvidenceChecklist;
    automation: DailyAutomationSummary;
    anomalies: AnomalyRecord[];
    generatedAt: string;
}

function dayBounds(date: string): { start: string; end: string } {
    return {
        start: `${date}T00:00:00.000Z`,
        end: `${date}T23:59:59.999Z`,
    };
}

/** Map a change category onto a human work-area label. */
function categoryToWorkArea(category: string | null): string | null {
    switch (category) {
        case 'FEATURE': return 'Feature Development';
        case 'BUG_FIX': return 'Bug Fixing';
        case 'REFACTOR': return 'Refactoring';
        case 'TESTING': return 'Testing';
        case 'DOCUMENTATION': return 'Documentation';
        case 'CONFIGURATION': return 'Configuration';
        case 'DEPENDENCY': return 'Dependencies';
        case 'GENERATED': return 'Generated Code';
        case 'FORMATTING': return 'Formatting';
        default: return null;
    }
}

/**
 * Load org thresholds (with defaults for missing settings rows).
 */
async function loadThresholds(
    supabase: SupabaseClient,
    organizationId: string
): Promise<AnomalyThresholds> {
    const { data } = await supabase
        .from('work_intelligence_settings')
        .select('anomaly_thresholds')
        .eq('organization_id', organizationId)
        .maybeSingle();
    const raw = (data?.anomaly_thresholds ?? {}) as Partial<AnomalyThresholds>;
    return { ...DEFAULT_THRESHOLDS, ...raw };
}

/**
 * Compute one employee's daily report and persist it to daily_work_reports.
 * Idempotent: upsert on (employee_id, report_date).
 */
export async function generateDailyReport(
    supabase: SupabaseClient,
    input: DailyReportInput
): Promise<DailyReportResult> {
    const { organizationId, employeeId, date } = input;
    const { start, end } = dayBounds(date);

    // ---- Accounts -----------------------------------------------------------
    const { data: accounts } = await supabase
        .from('git_accounts')
        .select('id, github_username')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId);
    const accountIds = (accounts ?? []).map((a: { id: string }) => a.id);

    // ---- Day activity -------------------------------------------------------
    const emptyCounts = {
        repositories: 0, commits: 0, pushes: 0,
        pullRequests: 0, reviews: 0, ciRuns: 0, filesChanged: 0,
    };

    if (accountIds.length === 0) {
        const result: DailyReportResult = {
            status: 'INSUFFICIENT_EVIDENCE',
            reason:
                'No GitHub account is connected for this employee, so no work ' +
                'evidence can be collected. Connect an account in Settings → ' +
                'Integrations → GitHub to enable evidence collection.',
            counts: emptyCounts,
            workAreas: [],
            checklist: {
                identity_verified: false,
                push_provenance: false,
                signed_commit: false,
                meaningful_source_change: false,
                test_activity: false,
                pr_activity: false,
                review_activity: false,
                ci_activity: false,
                task_linkage: false,
            },
            automation: { agents: [], bots: [] },
            anomalies: [],
            generatedAt: new Date().toISOString(),
        };
        await persistReport(supabase, input, result);
        return result;
    }

    let commitQ = supabase
        .from('git_commits')
        .select('id, sha, message, committed_at, author_name, author_email, github_actor, git_account_id, is_bot, change_category, meaningful_score, additions, deletions, changed_files, repository_id, push_event_id')
        .in('git_account_id', accountIds)
        .gte('committed_at', start)
        .lte('committed_at', end);
    const { data: commits } = await commitQ;

    const { data: pushes } = await supabase
        .from('git_push_events')
        .select('id, pushed_at, is_bot, commit_shas')
        .in('git_account_id', accountIds)
        .gte('pushed_at', start)
        .lte('pushed_at', end);

    const { data: prs } = await supabase
        .from('git_pull_requests')
        .select('id, pr_number, title, gh_created_at')
        .in('git_account_id', accountIds)
        .gte('gh_created_at', start)
        .lte('gh_created_at', end);

    const { data: reviews } = await supabase
        .from('git_pull_request_reviews')
        .select('id, submitted_at')
        .in('git_account_id', accountIds)
        .gte('submitted_at', start)
        .lte('submitted_at', end);

    const { data: runs } = await supabase
        .from('git_workflow_runs')
        .select('id, run_started_at, conclusion')
        .in('git_account_id', accountIds)
        .gte('run_started_at', start)
        .lte('run_started_at', end);

    // Commit files for churn categories (bounded: 30 most recent commits)
    const commitIds = (commits ?? []).map((c: { id: string }) => c.id);
    const { data: fileRows } = commitIds.length
        ? await supabase
            .from('git_commit_files')
            .select('commit_id, path, additions, deletions')
            .in('commit_id', commitIds.slice(0, 30))
        : { data: [] };

    // ---- Work areas ---------------------------------------------------------
    const workAreas = new Set<string>();
    for (const c of (commits ?? []) as Array<{ change_category: string | null }>) {
        const area = categoryToWorkArea(c.change_category);
        if (area) workAreas.add(area);
    }

    // ---- Anomalies ----------------------------------------------------------
    const signals = (commits ?? []).map((c) => {
        const files = (fileRows ?? [])
            .filter((f: { commit_id: string }) => f.commit_id === c.id)
            .map((f: { path: string; additions: number; deletions: number }) => ({
                path: f.path,
                additions: f.additions,
                deletions: f.deletions,
            }));
        const summary: DiffSummary = summarizeDiff(files);
        return {
            id: c.id,
            sha: c.sha,
            committedAt: c.committed_at,
            authorName: c.author_name,
            authorEmail: c.author_email,
            githubActor: c.github_actor,
            gitAccountId: c.git_account_id,
            employeeId,
            isBot: c.is_bot,
            changeCategory: c.change_category,
            meaningfulScore: c.meaningful_score,
            summary,
            repositoryId: c.repository_id,
            message: c.message,
            hasPushEvent: Boolean(c.push_event_id),
            associatedPrId: null,
            hasTestFiles: summary.testFiles > 0,
            hasCiRuns: false,
        };
    });

    // Historical baseline: average commits/day over the previous 30 days.
    const historyStart = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { count: historyCount } = await supabase
        .from('git_commits')
        .select('id', { count: 'exact', head: true })
        .in('git_account_id', accountIds)
        .gte('committed_at', historyStart)
        .lt('committed_at', start);
    const historicalDaily = historyCount ? historyCount / 30 : 0;

    const thresholds = await loadThresholds(supabase, organizationId);

    const anomalies = analyzeAnomalies({
        commits: signals,
        pushes: (pushes ?? []).map((p: { id: string; pushed_at: string; is_bot: boolean; commit_shas: string[] }) => ({
            id: p.id,
            pushedAt: p.pushed_at,
            commitCount: (p.commit_shas ?? []).length,
            isBot: p.is_bot,
        })),
        historicalDailyCommitCount: Math.round(historicalDaily),
        thresholds,
    });

    // Persist detected anomalies (idempotent by rule+window)
    for (const a of anomalies) {
        if (a.severity === 'NORMAL') continue;
        const { error } = await supabase.from('activity_anomalies').insert({
            organization_id: organizationId,
            employee_id: employeeId,
            severity: a.severity,
            rule_code: a.ruleCode,
            rule_version: ANOMALY_RULE_VERSION,
            reason: a.reason,
            explanation: a.explanation,
            evidence: a.evidence,
            affected_event_ids: a.affectedEventIds,
            window_start: a.windowStart ?? null,
            window_end: a.windowEnd ?? null,
        });
        // 23505 = unique violation — anomalies aren't unique-constrained, so
        // this only fails on real errors; log and continue.
        if (error) {
            console.warn('anomaly insert failed', error.message);
        }
    }

    // ---- Agent / bot summary ------------------------------------------------
    const { data: agentEvents } = await supabase
        .from('agent_events')
        .select('agent_type, agent_name, detection_basis, commit_id')
        .eq('organization_id', organizationId)
        .in('commit_id', commitIds.length ? commitIds : ['00000000-0000-0000-0000-000000000000']);

    const agentCounts = new Map<string, DailyAutomationSummary['agents'][number]>();
    for (const ev of (agentEvents ?? []) as Array<{
        agent_type: string; agent_name: string | null;
        detection_basis: string; commit_id: string;
    }>) {
        const key = `${ev.agent_type}|${ev.agent_name ?? ''}`;
        const cur = agentCounts.get(key);
        if (cur) cur.count += 1;
        else {
            agentCounts.set(key, {
                agentType: ev.agent_type as DailyAutomationSummary['agents'][number]['agentType'],
                agentName: ev.agent_name,
                basis: ev.detection_basis as DailyAutomationSummary['agents'][number]['basis'],
                count: 1,
            });
        }
    }

    const { data: automationEvents } = await supabase
        .from('automation_events')
        .select('bot_type, bot_name, commit_id, push_event_id')
        .eq('organization_id', organizationId);
    const relevantAutomation = (automationEvents ?? []).filter(
        (e: { commit_id: string | null; push_event_id: string | null }) =>
            (e.commit_id && commitIds.includes(e.commit_id)) ||
            (e.push_event_id && (pushes ?? []).some(
                (p: { id: string }) => p.id === e.push_event_id
            ))
    );
    const botCounts = new Map<string, DailyAutomationSummary['bots'][number]>();
    for (const ev of relevantAutomation as Array<{ bot_type: string; bot_name: string }>) {
        const key = `${ev.bot_type}|${ev.bot_name}`;
        const cur = botCounts.get(key);
        if (cur) cur.count += 1;
        else {
            botCounts.set(key, {
                botType: ev.bot_type as DailyAutomationSummary['bots'][number]['botType'],
                botName: ev.bot_name,
                count: 1,
            });
        }
    }

    // ---- Evidence checklist -------------------------------------------------
    const humanCommits = (commits ?? []).filter(
        (c: { is_bot: boolean }) => !c.is_bot
    );

    const { data: signatures } = await supabase
        .from('git_commit_signatures')
        .select('commit_id, signature_state')
        .in('commit_id', commitIds.length ? commitIds : ['00000000-0000-0000-0000-000000000000']);
    const hasSigned = (signatures ?? []).some(
        (s: { signature_state: string }) => s.signature_state === 'verified'
    );

    const { data: taskLinks } = await supabase
        .from('task_git_links')
        .select('task_id, commit_id')
        .eq('organization_id', organizationId);
    const linkedCommitIds = new Set(
        ((taskLinks ?? []) as Array<{ commit_id: string | null }>)
            .map((l) => l.commit_id)
            .filter((x): x is string => Boolean(x))
    );

    const hasMeaningful = signals.some(
        (s) => s.summary && (
            s.summary.churnByCategory.source > 0 ||
            s.summary.churnByCategory.test > 0 ||
            s.summary.churnByCategory.migration > 0
        )
    );

    const checklist: DailyEvidenceChecklist = {
        identity_verified: accountIds.length > 0 && (commits ?? []).some(
            (c: { git_account_id: string | null }) => c.git_account_id !== null
        ),
        push_provenance: (pushes ?? []).some(
            (p: { is_bot: boolean }) => !p.is_bot
        ),
        signed_commit: hasSigned,
        meaningful_source_change: hasMeaningful,
        test_activity: signals.some((s) => s.summary && s.summary.testFiles > 0)
            || (runs ?? []).length > 0,
        pr_activity: (prs ?? []).length > 0,
        review_activity: (reviews ?? []).length > 0,
        ci_activity: (runs ?? []).length > 0,
        task_linkage: (commits ?? []).some(
            (c: { id: string }) => linkedCommitIds.has(c.id)
        ),
    };

    // ---- Status -------------------------------------------------------------
    let status: AuthenticityStatus;
    let reason: string;

    const nonNormal = anomalies.filter((a) => a.severity !== 'NORMAL');
    if (nonNormal.length > 0) {
        const mapped = anomaliesToStatus(nonNormal);
        status = mapped.status;
        reason = mapped.reason;
    } else if (humanCommits.length === 0) {
        status = 'INSUFFICIENT_EVIDENCE';
        reason =
            (commits ?? []).length === 0
                ? 'No commits were recorded for this employee on this date.'
                : 'All recorded activity was attributed to automation; no human-authored commits were found.';
    } else if (checklist.meaningful_source_change && (checklist.push_provenance || checklist.identity_verified)) {
        status = 'VERIFIED';
        reason =
            `Evidence supports the recorded work: ${humanCommits.length} human-attributed ` +
            `commit(s) with meaningful source or test changes` +
            (checklist.signed_commit ? ', at least one verified signature' : '') +
            (checklist.pr_activity ? ', pull request activity' : '') +
            (checklist.ci_activity ? ', CI activity' : '') +
            (checklist.task_linkage ? ', and links to HEMS tasks' : '') +
            '.';
    } else if (!checklist.meaningful_source_change) {
        status = 'INSUFFICIENT_EVIDENCE';
        reason =
            `Commits were recorded (${humanCommits.length}) but none contained meaningful ` +
            `source, test or migration changes — activity is limited to generated, ` +
            `configuration, documentation or asset files.`;
    } else {
        status = 'VERIFIED';
        reason =
            `Human-attributed commits with meaningful changes were recorded, but ` +
            `identity could not be fully verified (no signed commits and author ` +
            `matched only by push provenance).`;
    }

    // ---- Persist ------------------------------------------------------------
    const repositoryIds = new Set(
        ((commits ?? []) as Array<{ repository_id: string }>).map((c) => c.repository_id)
    );

    const result: DailyReportResult = {
        status,
        reason,
        counts: {
            repositories: repositoryIds.size,
            commits: (commits ?? []).length,
            pushes: (pushes ?? []).length,
            pullRequests: (prs ?? []).length,
            reviews: (reviews ?? []).length,
            ciRuns: (runs ?? []).length,
            filesChanged: ((fileRows ?? []) as Array<{ commit_id: string }>).reduce(
                (acc, f) => acc + 1, 0
            ) === 0
                ? ((commits ?? []) as Array<{ changed_files: number }>).reduce(
                    (acc, c) => acc + (c.changed_files ?? 0), 0
                )
                : (fileRows ?? []).length,
        },
        workAreas: [...workAreas].slice(0, 8),
        checklist,
        automation: {
            agents: [...agentCounts.values()],
            bots: [...botCounts.values()],
        },
        anomalies: nonNormal,
        generatedAt: new Date().toISOString(),
    };

    await persistReport(supabase, input, result);
    return result;
}

async function persistReport(
    supabase: SupabaseClient,
    input: DailyReportInput,
    result: DailyReportResult
): Promise<void> {
    const { error } = await supabase
        .from('daily_work_reports')
        .upsert(
            {
                organization_id: input.organizationId,
                employee_id: input.employeeId,
                report_date: input.date,
                repository_count: result.counts.repositories,
                commit_count: result.counts.commits,
                push_count: result.counts.pushes,
                pr_count: result.counts.pullRequests,
                review_count: result.counts.reviews,
                ci_run_count: result.counts.ciRuns,
                files_changed: result.counts.filesChanged,
                work_areas: result.workAreas,
                evidence_summary: result.checklist,
                automation_summary: result.automation,
                anomaly_summary: result.anomalies.map((a) => ({
                    severity: a.severity,
                    ruleCode: a.ruleCode,
                    reason: a.reason,
                })),
                authenticity_status: result.status,
                status_reason: result.reason,
                ai_summary: input.aiSummary ?? null,
                ai_generated_at: input.aiSummary ? new Date().toISOString() : null,
                generated_at: result.generatedAt,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'employee_id,report_date' }
        );
    if (error) throw error;
}

/**
 * Record work_evidence rows for the day's facts (used by report generation
 * and by manual "recompute" from the admin UI).
 */
export async function recordDailyEvidenceFacts(
    supabase: SupabaseClient,
    organizationId: string,
    employeeId: string,
    date: string
): Promise<void> {
    // The ingest path already records per-commit evidence. This function
    // exists for recompute flows; it derives facts from the day's rows.
    const { start, end } = dayBounds(date);
    const { data: accounts } = await supabase
        .from('git_accounts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('employee_id', employeeId);
    const ids = (accounts ?? []).map((a: { id: string }) => a.id);
    if (ids.length === 0) return;

    const { data: commits } = await supabase
        .from('git_commits')
        .select('id, committed_at')
        .in('git_account_id', ids)
        .gte('committed_at', start)
        .lte('committed_at', end);

    const facts: EvidenceFact[] = [];
    for (const c of (commits ?? []) as Array<{ id: string; committed_at: string }>) {
        facts.push({
            employeeId,
            evidenceType: 'push_provenance',
            sourceTable: 'git_commits',
            sourceId: c.id,
            observedAt: c.committed_at,
        });
    }
    if (facts.length > 0) {
        const { error } = await supabase.from('work_evidence').insert(facts);
        if (error && error.code !== '23505') {
            throw error;
        }
    }
}
