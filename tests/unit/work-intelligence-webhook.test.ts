// =============================================================================
// Work Intelligence — Webhook signature, token crypto, correlation tests
// =============================================================================
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyWebhookSignature } from '@/lib/work-intelligence/crypto'
import {
    extractTaskRefs,
    matchBranchName,
} from '@/lib/work-intelligence/correlation'
import { parseGithubNoreply } from '@/lib/work-intelligence/identity'

const SECRET = 'test-webhook-secret'

function sign(body: string, secret = SECRET): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

describe('webhook signature verification (spec §5, §22)', () => {
    const body = JSON.stringify({ zen: 'Keep it logically awesome.' })

    it('accepts a correctly signed payload', () => {
        expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true)
    })

    it('rejects a tampered payload', () => {
        expect(verifyWebhookSignature(body + 'x', sign(body), SECRET)).toBe(false)
    })

    it('rejects a signature from a different secret', () => {
        expect(verifyWebhookSignature(body, sign(body, 'other-secret'), SECRET)).toBe(false)
    })

    it('rejects missing signature or missing secret', () => {
        expect(verifyWebhookSignature(body, null, SECRET)).toBe(false)
        expect(verifyWebhookSignature(body, sign(body), null)).toBe(false)
    })

    it('rejects non-sha256 signatures', () => {
        expect(verifyWebhookSignature(body, 'sha1=abc', SECRET)).toBe(false)
    })

    it('rejects wrong-length signatures without throwing', () => {
        expect(verifyWebhookSignature(body, 'sha256=deadbeef', SECRET)).toBe(false)
    })
})

describe('token encryption at rest (spec §3, §22)', () => {
    // These tests mutate ENCRYPTION_KEY and re-import the module so the
    // key-missing path is genuinely exercised. sequential execution.
    it('round-trips a token', async () => {
        process.env.ENCRYPTION_KEY = 'unit-test-encryption-key-32-chars-min'
        const mod = await import('@/lib/work-intelligence/crypto')
        const token = 'ghp_unit_test_token_12345'
        const encrypted = mod.encryptToken(token)
        expect(encrypted).not.toContain(token)
        expect(mod.decryptToken(encrypted)).toBe(token)
        delete process.env.ENCRYPTION_KEY
    })

    it('refuses to encrypt without ENCRYPTION_KEY (no silent default key)', async () => {
        process.env.ENCRYPTION_KEY = ''
        const mod = await import('@/lib/work-intelligence/crypto')
        expect(() => mod.encryptToken('ghp_x')).toThrow(mod.EncryptionKeyMissingError)
        delete process.env.ENCRYPTION_KEY
    })

    it('returns null when decrypting with the wrong key configured', async () => {
        process.env.ENCRYPTION_KEY = 'unit-test-encryption-key-32-chars-min'
        const enc = await import('@/lib/work-intelligence/crypto')
        const encrypted = enc.encryptToken('ghp_secret')
        process.env.ENCRYPTION_KEY = 'a-completely-different-long-key'
        const dec = await import('@/lib/work-intelligence/crypto')
        expect(dec.decryptToken(encrypted)).toBeNull()
        delete process.env.ENCRYPTION_KEY
    })
})

describe('task correlation matching (spec §16)', () => {
    const taskId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    it('matches full UUID in commit messages', () => {
        const refs = extractTaskRefs(`feat: thing for ${taskId}`, [taskId])
        expect(refs).toHaveLength(1)
        expect(refs[0].taskId).toBe(taskId)
    })

    it('matches 8-char short id in commit messages', () => {
        const refs = extractTaskRefs('fix: a1b2c3d4 handles nulls', [taskId])
        expect(refs).toHaveLength(1)
    })

    it('matches task: prefix references', () => {
        const refs = extractTaskRefs('chore: task:a1b2c3d4 cleanup', [taskId])
        expect(refs).toHaveLength(1)
    })

    it('does not match unrelated text', () => {
        expect(extractTaskRefs('feat: unrelated work', [taskId])).toHaveLength(0)
        expect(extractTaskRefs(null, [taskId])).toHaveLength(0)
    })

    it('does not match a short id embedded in a longer word', () => {
        // a1b2c3d4 inside xa1b2c3d4y must NOT match (word-boundary rule)
        expect(extractTaskRefs('ref: xa1b2c3d4y', [taskId])).toHaveLength(0)
    })

    it('matches branch names containing the short id', () => {
        const ref = matchBranchName('feat/a1b2c3d4-attendance-api', [taskId])
        expect(ref).not.toBeNull()
        expect(ref!.basis).toBe('branch_name_pattern')
    })

    it('does not match branches without the id', () => {
        expect(matchBranchName('feat/attendance-api', [taskId])).toBeNull()
        expect(matchBranchName(null, [taskId])).toBeNull()
    })
})

describe('GitHub noreply email parsing (identity, spec §7)', () => {
    it('extracts user id and login from noreply emails', () => {
        const { login, githubUserId } = parseGithubNoreply('12345678+jdoe@users.noreply.github.com')
        expect(login).toBe('jdoe')
        expect(githubUserId).toBe(12345678)
    })

    it('returns nulls for regular emails', () => {
        const { login, githubUserId } = parseGithubNoreply('jdoe@company.com')
        expect(login).toBeNull()
        expect(githubUserId).toBeNull()
    })
})
