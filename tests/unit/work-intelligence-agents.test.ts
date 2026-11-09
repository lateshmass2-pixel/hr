// =============================================================================
// Work Intelligence — AI agent provenance tests (spec §27)
// =============================================================================
// Verifies the hard rule: agents are recorded ONLY with explicit provenance
// (co-author trailers, app identities, generated-with footers) and NEVER
// from code style or message wording alone.
// =============================================================================
import { describe, it, expect } from 'vitest'
import {
    parseCoAuthors,
    detectAgentsFromMessage,
    detectAgentFromApp,
} from '@/lib/work-intelligence/agents'

describe('co-author parsing', () => {
    it('parses standard trailers', () => {
        const msg = [
            'feat: add payment retries',
            '',
            'Co-authored-by: Claude <noreply@anthropic.com>',
            'Co-authored-by: John Smith <john@company.com>',
        ].join('\n')
        const cos = parseCoAuthors(msg)
        expect(cos).toHaveLength(2)
        expect(cos[0].name).toBe('Claude')
        expect(cos[0].email).toBe('noreply@anthropic.com')
        expect(cos[1].name).toBe('John Smith')
    })

    it('dedupes identical trailers', () => {
        const msg = 'fix: x\n\nCo-authored-by: Claude <noreply@anthropic.com>\nCo-authored-by: Claude <noreply@anthropic.com>'
        expect(parseCoAuthors(msg)).toHaveLength(1)
    })

    it('handles trailers without emails', () => {
        const cos = parseCoAuthors('chore: y\n\nCo-authored-by: Copilot')
        expect(cos[0].name).toBe('Copilot')
        expect(cos[0].email).toBeNull()
    })

    it('returns empty for messages without trailers', () => {
        expect(parseCoAuthors('feat: no trailers here')).toHaveLength(0)
    })
})

describe('agent detection — explicit provenance only', () => {
    it('detects Claude Code co-author', () => {
        const detections = detectAgentsFromMessage(
            'feat: implement search\n\nCo-authored-by: Claude <noreply@anthropic.com>'
        )
        expect(detections).toHaveLength(1)
        expect(detections[0].agentType).toBe('CLAUDE')
        expect(detections[0].basis).toBe('co_author')
        expect(detections[0].confidence).toBe('high')
    })

    it('detects GitHub Copilot co-author', () => {
        const detections = detectAgentsFromMessage(
            'fix: guard null\n\nCo-authored-by: Copilot <copilot@users.noreply.github.com>'
        )
        expect(detections[0].agentType).toBe('COPILOT')
    })

    it('detects Cursor co-author', () => {
        const detections = detectAgentsFromMessage(
            'refactor: split component\n\nCo-authored-by: Cursor <cursor@cursor.com>'
        )
        expect(detections[0].agentType).toBe('CURSOR')
    })

    it('detects "Generated with Claude Code" footer', () => {
        const detections = detectAgentsFromMessage(
            'feat: auth flow\n\nGenerated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>'
        )
        // Both footer and co-author point at Claude — same key, deduped.
        const claudes = detections.filter((d) => d.agentType === 'CLAUDE')
        expect(claudes.length).toBeGreaterThanOrEqual(1)
        expect(detections.some((d) => d.basis === 'explicit_provenance')).toBe(true)
    })

    it('does NOT detect agents from human co-authors', () => {
        const detections = detectAgentsFromMessage(
            'feat: pair programming\n\nCo-authored-by: Priya Sharma <priya@company.com>'
        )
        expect(detections).toHaveLength(0)
    })

    it('does NOT detect agents from message wording alone', () => {
        // No provenance markers — must produce NOTHING, even though the
        // message mentions AI heavily.
        const detections = detectAgentsFromMessage(
            'feat: use machine learning AI neural network to write this code automatically'
        )
        expect(detections).toHaveLength(0)
    })
})

describe('agent detection from GitHub App identity', () => {
    it('maps copilot apps', () => {
        const d = detectAgentFromApp({ slug: 'github-copilot-pr-agent' })
        expect(d!.agentType).toBe('COPILOT')
        expect(d!.basis).toBe('app_identity')
    })

    it('maps claude apps', () => {
        const d = detectAgentFromApp({ slug: 'claude-app' })
        expect(d!.agentType).toBe('CLAUDE')
    })

    it('returns null for non-agent apps (e.g. a deploy app)', () => {
        expect(detectAgentFromApp({ slug: 'my-ci-deployer' })).toBeNull()
    })
})
