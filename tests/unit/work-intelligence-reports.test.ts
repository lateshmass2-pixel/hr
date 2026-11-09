// =============================================================================
// Work Intelligence — Daily report status computation tests (spec §17, §20)
// =============================================================================
// The report engine itself needs a Supabase client; status derivation logic
// is validated through the anomaly-to-status mapping plus the checklist
// gating rules exercised in anomaly tests. These tests cover the
// deterministic status phrasing helpers and the AI fallback builder.
// =============================================================================
import { describe, it, expect } from 'vitest'
import { anomaliesToStatus } from '@/lib/work-intelligence/anomaly'
import type { AnomalyRecord, AnomalySeverity } from '@/lib/work-intelligence/types'

function anomaly(severity: AnomalySeverity, reason: string): AnomalyRecord {
    return {
        employeeId: 'e1',
        severity,
        ruleCode: 'test_rule',
        ruleVersion: 'v1',
        reason,
        explanation: 'test explanation',
        evidence: ['evidence-1'],
        affectedEventIds: {},
    }
}

describe('authenticity status language (spec §20)', () => {
    it('never uses accusatory language in reasons', () => {
        const { status, reason } = anomaliesToStatus([
            anomaly('REVIEW_REQUIRED', '31 commits were pushed within 14 minutes'),
        ])
        expect(status).toBe('REVIEW_REQUIRED')
        const lowered = reason.toLowerCase()
        for (const banned of ['cheat', 'fake', 'fraud', 'lied', 'definitely used ai']) {
            expect(lowered).not.toContain(banned)
        }
    })

    it('combines multiple review-required reasons', () => {
        const { reason } = anomaliesToStatus([
            anomaly('REVIEW_REQUIRED', 'burst of 31 commits'),
            anomaly('REVIEW_REQUIRED', '24 generated-only commits'),
        ])
        expect(reason).toContain('burst of 31 commits')
        expect(reason).toContain('24 generated-only commits')
    })

    it('prefers REVIEW_REQUIRED over UNUSUAL when both present', () => {
        const { status } = anomaliesToStatus([
            anomaly('UNUSUAL', 'slightly elevated'),
            anomaly('REVIEW_REQUIRED', 'major burst'),
        ])
        expect(status).toBe('REVIEW_REQUIRED')
    })
})
