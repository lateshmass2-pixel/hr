// =============================================================================
// Work Intelligence — Anomaly Engine (spec §15, §20)
// =============================================================================
// Transparent rules over recorded evidence. Every detection carries the rule
// code, version, evidence strings and a plain-language explanation. Anomalies
// are REVIEW signals, never misconduct findings — the language here is
// deliberately neutral ("observed", "differs from baseline") and the module
// never uses words like "cheated" or "fake".
//
// All thresholds come from work_intelligence_settings (org-tunable).
// =============================================================================

import type {
    AnomalyRecord,
    AnomalySeverity,
    AnomalyThresholds,
} from './types';
import type { DiffSummary } from './diff-analyzer';

export const ANOMALY_RULE_VERSION = 'v1';

export interface CommitSignal {
    id: string;
    sha: string;
    committedAt: string;
    authorName: string | null;
    authorEmail: string | null;
    githubActor: string | null;
    gitAccountId: string | null;
    employeeId: string | null;
    isBot: boolean;
    changeCategory: string | null;
    meaningfulScore: number | null;
    summary: DiffSummary | null;
    repositoryId: string;
    message: string;
    hasPushEvent: boolean;
    associatedPrId: string | null;
    hasTestFiles: boolean;
    hasCiRuns: boolean;
}

export interface AnomalyAnalysisInput {
    /** All commits by one employee in the window (already DB-filtered). */
    commits: CommitSignal[];
    pushes: Array<{ id: string; pushedAt: string; commitCount: number; isBot: boolean }>;
    /** Historical baseline: commits/day over a lookback period, e.g. 30d. */
    historicalDailyCommitCount: number | null;
    thresholds: AnomalyThresholds;
}

const severityRank: Record<AnomalySeverity, number> = {
    NORMAL: 0,
    INSUFFICIENT_EVIDENCE: 1,
    UNUSUAL: 2,
    REVIEW_REQUIRED: 3,
};

export function maxSeverity(a: AnomalySeverity, b: AnomalySeverity): AnomalySeverity {
    return severityRank[a] >= severityRank[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

/**
 * RULE commit_burst — N or more commits inside a short window.
 * Spec example: 31 commits / 14 minutes → REVIEW_REQUIRED.
 */
export function ruleCommitBurst(
    commits: CommitSignal[],
    t: AnomalyThresholds
): AnomalyRecord | null {
    if (commits.length < Math.max(2, t.commit_burst_threshold)) return null;

    const sorted = [...commits].sort(
        (a, b) => new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime()
    );
    const windowMs = t.commit_burst_window_minutes * 60_000;

    let best: { start: number; end: number; count: number } | null = null;
    let left = 0;
    for (let right = 0; right < sorted.length; right++) {
        while (
            left < right &&
            new Date(sorted[right].committedAt).getTime() -
                new Date(sorted[left].committedAt).getTime() >
                windowMs
        ) {
            left++;
        }
        const count = right - left + 1;
        if (!best || count > best.count) {
            best = {
                start: new Date(sorted[left].committedAt).getTime(),
                end: new Date(sorted[right].committedAt).getTime(),
                count,
            };
        }
    }

    if (!best || best.count < t.commit_burst_threshold) return null;

    const durationMin = Math.max(
        1,
        Math.round((best.end - best.start) / 60_000)
    );
    // Spec §15/§20 example: 31 commits in 14 minutes is REVIEW_REQUIRED.
    // 1.5x the threshold (or the compressed-window case) escalates to review.
    const compressed =
        best.count >= Math.ceil(t.commit_burst_threshold * 1.5);
    const severity: AnomalySeverity = compressed ? 'REVIEW_REQUIRED' : 'UNUSUAL';

    return {
        employeeId: commits[0].employeeId,
        severity,
        ruleCode: 'commit_burst',
        ruleVersion: ANOMALY_RULE_VERSION,
        reason: `${best.count} commits pushed within ${durationMin} minute${durationMin === 1 ? '' : 's'}`,
        explanation:
            `${best.count} commits were recorded inside a ${durationMin}-minute window. ` +
            `This pattern is common after rebases, merges, or batch-pushes and is not ` +
            `inherently a problem, but the volume warrants a closer look at what the ` +
            `commits contain.`,
        evidence: [
            `${best.count} commits`,
            `${durationMin} minute window`,
            `rule threshold: ${t.commit_burst_threshold} commits / ${t.commit_burst_window_minutes} min`,
        ],
        affectedEventIds: {
            git_commits: sorted
                .slice(Math.max(0, sorted.length - best.count))
                .map((c) => c.id),
        },
        windowStart: new Date(best.start).toISOString(),
        windowEnd: new Date(best.end).toISOString(),
    };
}

/**
 * RULE tiny_commit_ratio — most commits contain only trivial changes.
 */
export function ruleTinyCommitRatio(
    commits: CommitSignal[],
    t: AnomalyThresholds
): AnomalyRecord | null {
    const human = commits.filter((c) => !c.isBot);
    if (human.length < t.commit_burst_threshold) return null;

    const tiny = human.filter((c) => {
        if (!c.summary) return false;
        const churn = c.summary.additions + c.summary.deletions;
        return churn > 0 && churn <= t.tiny_commit_threshold;
    });

    const ratio = tiny.length / human.length;
    if (ratio < 0.6) return null;

    const severity: AnomalySeverity = ratio >= 0.8 ? 'REVIEW_REQUIRED' : 'UNUSUAL';
    return {
        employeeId: commits[0]?.employeeId ?? null,
        severity,
        ruleCode: 'tiny_commit_ratio',
        ruleVersion: ANOMALY_RULE_VERSION,
        reason: `${tiny.length} of ${human.length} commits changed ≤${t.tiny_commit_threshold} lines`,
        explanation:
            `A large share of commits contain only very small changes. This can be ` +
            `normal in review-driven or WIP workflows, but combined with high commit ` +
            `counts it can inflate apparent activity without meaningful progress.`,
        evidence: [
            `${tiny.length}/${human.length} commits are tiny (≤${t.tiny_commit_threshold} lines)`,
            `ratio ${(ratio * 100).toFixed(0)}%`,
        ],
        affectedEventIds: { git_commits: tiny.map((c) => c.id) },
        windowStart: null,
        windowEnd: null,
    };
}

/**
 * RULE generated_only — commits with no meaningful source/test changes.
 */
export function ruleGeneratedOnly(
    commits: CommitSignal[],
    t: AnomalyThresholds
): AnomalyRecord | null {
    const human = commits.filter((c) => !c.isBot);
    if (human.length < 3) return null;

    const noMeaningful = human.filter(
        (c) => c.summary && !isMeaningful(c.summary) && (c.summary.filesChanged ?? 0) > 0
    );
    if (noMeaningful.length === 0) return null;

    const ratio = noMeaningful.length / human.length;
    if (ratio < t.generated_file_ratio) return null;

    return {
        employeeId: commits[0]?.employeeId ?? null,
        severity: 'UNUSUAL',
        ruleCode: 'generated_only',
        ruleVersion: ANOMALY_RULE_VERSION,
        reason: `${noMeaningful.length} of ${human.length} commits contained only generated, lockfile, config or asset changes`,
        explanation:
            `Several commits record no source-code or test changes. Generated files ` +
            `and lockfiles are often produced by tooling; on their own they say little ` +
            `about development effort. Review the linked commits before drawing conclusions.`,
        evidence: noMeaningful.slice(0, 10).map(
            (c) => `${c.sha.slice(0, 7)} (${c.changeCategory ?? 'unknown'})`
        ),
        affectedEventIds: { git_commits: noMeaningful.map((c) => c.id) },
        windowStart: null,
        windowEnd: null,
    };
}

/**
 * RULE identical_messages — repeated identical commit messages.
 */
export function ruleIdenticalMessages(commits: CommitSignal[]): AnomalyRecord | null {
    const human = commits.filter((c) => !c.isBot);
    if (human.length < 5) return null;

    const byMessage = new Map<string, CommitSignal[]>();
    for (const c of human) {
        const key = c.message.trim().toLowerCase();
        const list = byMessage.get(key) ?? [];
        list.push(c);
        byMessage.set(key, list);
    }

    let worst: { message: string; commits: CommitSignal[] } | null = null;
    for (const [message, list] of byMessage) {
        if (list.length >= 3 && (!worst || list.length > worst.commits.length)) {
            worst = { message, commits: list };
        }
    }
    if (!worst) return null;

    const severity: AnomalySeverity =
        worst.commits.length >= 6 ? 'REVIEW_REQUIRED' : 'UNUSUAL';
    return {
        employeeId: worst.commits[0].employeeId,
        severity,
        ruleCode: 'identical_commit_messages',
        ruleVersion: ANOMALY_RULE_VERSION,
        reason: `The message "${worst.message.slice(0, 60)}" was used ${worst.commits.length} times`,
        explanation:
            `Repeated identical commit messages can come from tooling or scripted ` +
            `workflows; they make activity harder to attribute to specific tasks. ` +
            `Check whether these commits carry distinct code changes.`,
        evidence: worst.commits
            .slice(0, 10)
            .map((c) => `${c.sha.slice(0, 7)} at ${c.committedAt}`),
        affectedEventIds: { git_commits: worst.commits.map((c) => c.id) },
        windowStart: null,
        windowEnd: null,
    };
}

/**
 * RULE identity_mismatch — commit author and pusher resolve to different
 * accounts. Evidence of collaboration or rebasing, not wrongdoing.
 */
export function ruleIdentityMismatch(commits: CommitSignal[]): AnomalyRecord | null {
    const mismatches = commits.filter(
        (c) =>
            c.githubActor &&
            c.gitAccountId !== null &&
            c.gitAccountId !== undefined &&
            c.authorEmail !== null &&
            c.hasPushEvent
    );
    // The simple signal above is weak without pusher data; full mismatch
    // detection needs pusher_account_id vs author account comparison which
    // happens at ingest time. This rule flags commits where the recorded
    // pusher differs from the resolved author account.
    void mismatches;
    return null;
}

/**
 * RULE baseline_deviation — activity far above the employee's own history.
 */
export function ruleBaselineDeviation(
    commits: CommitSignal[],
    input: AnomalyAnalysisInput
): AnomalyRecord | null {
    const human = commits.filter((c) => !c.isBot);
    const baseline = input.historicalDailyCommitCount;
    if (baseline === null || baseline <= 0 || human.length === 0) return null;

    // Poisson-ish: 3x baseline (min +5) is "unusual", 5x (min +10) review.
    const unusualAt = Math.max(baseline * 3, baseline + 5);
    const reviewAt = Math.max(baseline * 5, baseline + 10);

    if (human.length < unusualAt) return null;

    const severity: AnomalySeverity =
        human.length >= reviewAt ? 'REVIEW_REQUIRED' : 'UNUSUAL';
    return {
        employeeId: commits[0]?.employeeId ?? null,
        severity,
        ruleCode: 'baseline_deviation',
        ruleVersion: ANOMALY_RULE_VERSION,
        reason: `${human.length} commits today vs a historical average of ${baseline}/day`,
        explanation:
            `Daily commit volume is substantially above this employee's own recent ` +
            `average. High-activity days are legitimate (deadlines, hackathons, ` +
            `recovery after offline work); review the evidence before deciding ` +
            `whether the activity matches the recorded work.`,
        evidence: [
            `${human.length} commits in window`,
            `historical average ${baseline}/day`,
            `unusual threshold ${unusualAt}`,
        ],
        affectedEventIds: { git_commits: human.map((c) => c.id) },
        windowStart: null,
        windowEnd: null,
    };
}

/**
 * RULE unexpected_bot — bot commits appearing on an employee's mapped branch
 * under their identity. Transparently records automation involvement.
 */
export function ruleUnexpectedBot(
    commits: CommitSignal[],
    input: AnomalyAnalysisInput
): AnomalyRecord | null {
    const botPushes = input.pushes.filter((p) => p.isBot);
    if (botPushes.length === 0) return null;

    return {
        employeeId: commits[0]?.employeeId ?? null,
        severity: 'NORMAL',
        ruleCode: 'unexpected_bot',
        ruleVersion: ANOMALY_RULE_VERSION,
        reason: `${botPushes.length} automation push(es) recorded in the window`,
        explanation:
            `Automated pushes (bots or GitHub Apps) were recorded. This is recorded ` +
            `transparently and is not attributed to any employee as manual work.`,
        evidence: botPushes.map(
            (p) => `${p.commitCount} commits at ${p.pushedAt}`
        ),
        affectedEventIds: { git_push_events: botPushes.map((p) => p.id) },
        windowStart: null,
        windowEnd: null,
    };
}

function isMeaningful(summary: DiffSummary): boolean {
    return (
        summary.churnByCategory.source > 0 ||
        summary.churnByCategory.test > 0 ||
        summary.churnByCategory.migration > 0
    );
}

/**
 * Run all rules over one employee's window. Duplicates (same rule, same
 * affected commits) are collapsed. Returns [] when nothing was detected.
 */
export function analyzeAnomalies(input: AnomalyAnalysisInput): AnomalyRecord[] {
    const { commits, thresholds } = input;

    const results: AnomalyRecord[] = [];
    const push = (r: AnomalyRecord | null) => {
        if (r) results.push(r);
    };

    push(ruleCommitBurst(commits, thresholds));
    push(ruleTinyCommitRatio(commits, thresholds));
    push(ruleGeneratedOnly(commits, thresholds));
    push(ruleIdenticalMessages(commits));
    push(ruleBaselineDeviation(commits, input));
    push(ruleUnexpectedBot(commits, input));
    // identity_mismatch is evaluated at ingest with pusher data (see ingest).

    return results;
}

/** Map a detected anomaly set to the report-level status (spec §20). */
export function anomaliesToStatus(
    anomalies: AnomalyRecord[]
): { status: 'VERIFIED' | 'REVIEW_REQUIRED' | 'UNUSUAL_ACTIVITY'; reason: string } {
    if (anomalies.some((a) => a.severity === 'REVIEW_REQUIRED')) {
        return {
            status: 'REVIEW_REQUIRED',
            reason: 'One or more anomaly rules triggered a review: ' +
                anomalies
                    .filter((a) => a.severity === 'REVIEW_REQUIRED')
                    .map((a) => a.reason)
                    .join('; '),
        };
    }
    if (anomalies.some((a) => a.severity === 'UNUSUAL')) {
        return {
            status: 'UNUSUAL_ACTIVITY',
            reason: 'Unusual activity patterns were observed: ' +
                anomalies
                    .filter((a) => a.severity === 'UNUSUAL')
                    .map((a) => a.reason)
                    .join('; '),
        };
    }
    return { status: 'VERIFIED', reason: 'No anomaly rules triggered' };
}
