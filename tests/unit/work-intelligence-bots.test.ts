// =============================================================================
// Work Intelligence — Bot detection tests (spec §27)
// =============================================================================
import { describe, it, expect } from 'vitest'
import {
    detectBotFromActor,
    detectBotFromApp,
    classifyBotEvidence,
} from '@/lib/work-intelligence/bots'

describe('bot detection — explicit evidence only', () => {
    it('detects GitHub Bot type actors', () => {
        const bot = detectBotFromActor({ login: 'dependabot[bot]', type: 'Bot' })
        expect(bot).not.toBeNull()
        expect(bot!.botType).toBe('dependabot')
        expect(bot!.botName).toBe('dependabot[bot]')
    })

    it('classifies GitHub Actions bots', () => {
        const bot = detectBotFromActor({ login: 'github-actions[bot]', type: 'Bot' })
        expect(bot!.botType).toBe('github-actions')
    })

    it('detects renovate', () => {
        const bot = detectBotFromActor({ login: 'renovate[bot]', type: 'Bot' })
        expect(bot!.botType).toBe('renovate')
    })

    it('treats unknown Bot-type actors as github-app', () => {
        const bot = detectBotFromActor({ login: 'some-custom-app[bot]', type: 'Bot' })
        expect(bot).not.toBeNull()
        expect(bot!.botType).toBe('github-app')
    })

    it('does NOT classify humans as bots based on commit-message wording', () => {
        // A human named "fix-bot-typo" pushing "chore: bump deps" is NOT a bot.
        const bot = detectBotFromActor({ login: 'lateshk', type: 'User' })
        expect(bot).toBeNull()
    })

    it('returns null for missing actors', () => {
        expect(detectBotFromActor(null)).toBeNull()
        expect(detectBotFromActor({ login: null })).toBeNull()
    })

    it('detects GitHub App identities', () => {
        const bot = detectBotFromApp({ slug: 'my-deploy-app', name: null })
        expect(bot!.botType).toBe('github-app')
        expect(bot!.botName).toBe('my-deploy-app')
    })

    it('classifyBotEvidence combines actor and app evidence', () => {
        const result = classifyBotEvidence({ login: 'dependabot[bot]', type: 'Bot' })
        expect(result.isBot).toBe(true)
        expect(result.botType).toBe('dependabot')
        expect(result.automationSource).toBe('dependabot[bot]')

        const human = classifyBotEvidence({ login: 'john', type: 'User' })
        expect(human.isBot).toBe(false)
        expect(human.botType).toBeNull()
    })
})
