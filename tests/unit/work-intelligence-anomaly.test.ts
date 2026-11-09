// =============================================================================
// Work Intelligence — Anomaly engine tests (spec §27)
// =============================================================================
// Fixture scenarios: burst commits, tiny commits, generated-only changes,
// identical messages, baseline deviation, unexpected bots.
// =============================================================================
import { describe, it, expect } from 'vitest'
import {
    analyzeAnomalies,
    anomaliesToStatus,
    ruleCommitBurst,
    ruleTinyCommitRatio,
    ruleIdenticalMessages,
    type CommitSignal,
} from '@/lib/work-intelligence/anomaly'
import { summarizeDiff } from '@/lib/work-intelligence/diff-analyzer'
import type { AnomalyThresholds } from '@/lib/work-intelligence/types'

const T: AnomalyThresholds = {
    commit_burst_window_minutes: 15,
    commit_burst_threshold: 20,
    tiny_commit_threshold: 3,
    generated_file_ratio: 0.8,
}

function commit(overrides: Partial<CommitSignal> & { id: string; committedAt: string }): CommitSignal {
    return {
        sha: overrides.id.slice(0, 7),
        authorName: 'Dev',
        authorEmail: 'dev@company.com',
        githubActor: 'dev',
        gitAccountId: 'acc-1',
        employeeId: 'emp-1',
        isBot: false,
        changeCategory: 'UNKNOWN',
        meaningfulScore: null,
        summary: null,
        repositoryId: 'repo-1',
        message: 'work',
        hasPushEvent: true,
        associatedPrId: null,
        hasTestFiles: false,
        hasCiRuns: false,
        ...overrides,
    } as CommitSignal
}

function at(minutes: number): string {
    return new Date(Date.UTC(2026, 8, 23, 9, 0) + minutes * 60_000).toISOString()
}

describe('commit burst rule (spec §15 example)', () => {
    it('flags 31 commits inside a 14-minute window as REVIEW_REQUIRED', () => {
        const commits = Array.from({ length: 31 }, (_, i) =>
            commit({
                id: `burst-${i}`,
                committedAt: at(Math.floor(i * (14 / 30))),
                message: `change ${i}`,
                summary: summarizeDiff([{ path: 'src/a.ts', additions: 10, deletions: 2 }]),
            })
        )
        const result = ruleCommitBurst(commits, T)
        expect(result).not.toBeNull()
        expect(result!.severity).toBe('REVIEW_REQUIRED')
        expect(result!.ruleCode).toBe('commit_burst')
        expect(result!.evidence.length).toBeGreaterThanOrEqual(3)
        expect(result!.evidence[0]).toContain('31 commits')
    })

    it('does not flag 10 well-spaced commits', () => {
        const commits = Array.from({ length: 10 }, (_, i) =>
            commit({ id: `calm-${i}`, committedAt: at(i * 60), message: `change ${i}` })
        )
        expect(ruleCommitBurst(commits, T)).toBeNull()
    })

    it('uses UNUSUAL (not REVIEW_REQUIRED) just above threshold', () => {
        const commits = Array.from({ length: 21 }, (_, i) =>
            commit({ id: `mild-${i}`, committedAt: at(Math.floor(i / 2)), message: `c ${i}` })
        )
        const r = ruleCommitBurst(commits, T)
        expect(r!.severity).toBe('UNUSUAL')
    })
})

describe('tiny commit ratio rule', () => {
    it('flags when most commits are tiny', () => {
        const commits = Array.from({ length: 25 }, (_, i) =>
            commit({
                id: `tiny-${i}`,
                committedAt: at(i * 30),
                message: `t${i}`,
                summary: summarizeDiff([{ path: 'src/a.ts', additions: 1, deletions: 1 }]),
            })
        )
        const r = ruleTinyCommitRatio(commits, T)
        expect(r).not.toBeNull()
        expect(r!.ruleCode).toBe('tiny_commit_ratio')
        expect(r!.severity).toBe('REVIEW_REQUIRED') // 100% tiny ≥ 80%
    })

    it('does not flag substantial commits', () => {
        const commits = Array.from({ length: 25 }, (_, i) =>
            commit({
                id: `big-${i}`,
                committedAt: at(i * 30),
                message: `b${i}`,
                summary: summarizeDiff([{ path: 'src/a.ts', additions: 50, deletions: 5 }]),
            })
        )
        expect(ruleTinyCommitRatio(commits, T)).toBeNull()
    })

    it('ignores bot commits', () => {
        const commits = Array.from({ length: 25 }, (_, i) =>
            commit({
                id: `bot-${i}`,
                committedAt: at(i),
                message: 'bump',
                isBot: true,
                summary: summarizeDiff([{ path: 'package-lock.json', additions: 1, deletions: 1 }]),
            })
        )
        expect(ruleTinyCommitRatio(commits, T)).toBeNull()
    })
})

describe('identical message rule', () => {
    it('flags 3+ identical messages', () => {
        const commits = Array.from({ length: 6 }, (_, i) =>
            commit({ id: `same-${i}`, committedAt: at(i * 20), message: 'update' })
        )
        const r = ruleIdenticalMessages(commits)
        expect(r).not.toBeNull()
        expect(r!.ruleCode).toBe('identical_commit_messages')
        expect(r!.severity).toBe('REVIEW_REQUIRED') // 6 ≥ 6
    })

    it('does not flag varied messages', () => {
        const commits = Array.from({ length: 8 }, (_, i) =>
            commit({ id: `var-${i}`, committedAt: at(i * 20), message: `distinct change ${i}` })
        )
        expect(ruleIdenticalMessages(commits)).toBeNull()
    })
})

describe('generated-only rule', () => {
    it('flags commits with no meaningful source changes', () => {
        const commits = [
            ...Array.from({ length: 8 }, (_, i) =>
                commit({
                    id: `gen-${i}`,
                    committedAt: at(i * 20),
                    message: `g${i}`,
                    summary: summarizeDiff([{ path: 'dist/bundle.js', additions: 300, deletions: 100 }]),
                })
            ),
            ...Array.from({ length: 2 }, (_, i) =>
                commit({
                    id: `src-${i}`,
                    committedAt: at(200 + i),
                    message: `s${i}`,
                    summary: summarizeDiff([{ path: 'src/a.ts', additions: 30, deletions: 5 }]),
                })
            ),
        ]
        const input = { commits, pushes: [], historicalDailyCommitCount: null, thresholds: T }
        const results = analyzeAnomalies(input)
        expect(results.some((r) => r.ruleCode === 'generated_only')).toBe(true)
    })
})

describe('baseline deviation rule', () => {
    it('flags activity far above the employee history', () => {
        const commits = Array.from({ length: 40 }, (_, i) =>
            commit({
                id: `spike-${i}`,
                committedAt: at(i * 10),
                message: `spike ${i}`,
                summary: summarizeDiff([{ path: 'src/a.ts', additions: 20, deletions: 2 }]),
            })
        )
        const input = {
            commits,
            pushes: [] as never[],
            historicalDailyCommitCount: 2,
            thresholds: T,
        }
        const results = analyzeAnomalies(input)
        const baseline = results.find((r) => r.ruleCode === 'baseline_deviation')
        expect(baseline).toBeDefined()
        expect(baseline!.severity).toBe('REVIEW_REQUIRED') // 40 ≥ 5*2+10
    })

    it('does not flag normal days', () => {
        const commits = Array.from({ length: 4 }, (_, i) =>
            commit({ id: `norm-${i}`, committedAt: at(i * 90), message: `n${i}` })
        )
        const input = {
            commits,
            pushes: [] as never[],
            historicalDailyCommitCount: 5,
            thresholds: T,
        }
        expect(
            analyzeAnomalies(input).find((r) => r.ruleCode === 'baseline_deviation')
        ).toBeUndefined()
    })
})

describe('status mapping (spec §20)', () => {
    it('REVIEW_REQUIRED anomalies drive REVIEW_REQUIRED status with a reason', () => {
        const { status, reason } = anomaliesToStatus([
            {
                employeeId: 'e1',
                severity: 'REVIEW_REQUIRED',
                ruleCode: 'commit_burst',
                ruleVersion: 'v1',
                reason: '31 commits pushed within 14 minutes',
                explanation: '',
                evidence: [],
                affectedEventIds: {},
            },
        ])
        expect(status).toBe('REVIEW_REQUIRED')
        expect(reason).toContain('31 commits')
    })

    it('UNUSUAL anomalies drive UNUSUAL_ACTIVITY status', () => {
        const { status } = anomaliesToStatus([
            {
                employeeId: 'e1',
                severity: 'UNUSUAL',
                ruleCode: 'tiny_commit_ratio',
                ruleVersion: 'v1',
                reason: 'tiny commits',
                explanation: '',
                evidence: [],
                affectedEventIds: {},
            },
        ])
        expect(status).toBe('UNUSUAL_ACTIVITY')
    })

    it('no anomalies → VERIFIED', () => {
        const { status } = anomaliesToStatus([])
        expect(status).toBe('VERIFIED')
    })
})

describe('unexpected bot transparency', () => {
    it('records bot pushes as NORMAL severity (transparent, not accusatory)', () => {
        const input = {
            commits: [commit({ id: 'c1', committedAt: at(0) })],
            pushes: [{ id: 'p1', pushedAt: at(0), commitCount: 3, isBot: true }],
            historicalDailyCommitCount: null,
            thresholds: T,
        }
        const results = analyzeAnomalies(input)
        const bot = results.find((r) => r.ruleCode === 'unexpected_bot')
        expect(bot).toBeDefined()
        expect(bot!.severity).toBe('NORMAL')
        expect(bot!.explanation).toContain('not attributed')
    })
})
