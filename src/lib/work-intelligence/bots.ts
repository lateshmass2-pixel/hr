// =============================================================================
// Work Intelligence — Bot / Automation Detection
// =============================================================================
// Explicit evidence only (spec §10). A commit is bot-authored ONLY when GitHub
// itself says so: sender.type === 'Bot', a known automation login, or a
// GitHub App identity. Commit-message wording is NEVER used — "fix: bump
// deps" from a human is not automation.
// =============================================================================

import type { BotType } from './types';

interface BotMatch {
    botType: BotType;
    botName: string;
}

const KNOWN_BOT_LOGINS: Record<string, BotType> = {
    'dependabot[bot]': 'dependabot',
    'dependabot-preview[bot]': 'dependabot',
    'renovate[bot]': 'renovate',
    'renovate-preview[bot]': 'renovate',
    'github-actions[bot]': 'github-actions',
    'actions-user': 'github-actions',
    'copilot-pf[bot]': 'other', // GitHub Copilot automation; agent side handled by agents.ts
};

const BOT_LOGIN_PATTERNS: Array<{ re: RegExp; type: BotType }> = [
    { re: /(^|\/)dependabot(\[bot\]|-preview\[bot\])?$/i, type: 'dependabot' },
    { re: /(^|\/)renovate(\[bot\])?$/i, type: 'renovate' },
    { re: /(^|\/)github-actions(\[bot\])?$/i, type: 'github-actions' },
];

export interface ActorLike {
    login: string | null | undefined;
    type?: string | null | undefined;   // 'User' | 'Bot' | 'Organization'
    id?: number | null | undefined;
}

/**
 * Detect explicit automation from GitHub actor metadata.
 * Returns null when there is no explicit evidence of automation.
 */
export function detectBotFromActor(actor: ActorLike | null | undefined): BotMatch | null {
    if (!actor || !actor.login) return null;

    // 1. GitHub's own Bot type — strongest evidence.
    if (actor.type === 'Bot') {
        const known = KNOWN_BOT_LOGINS[actor.login.toLowerCase()];
        const pattern = BOT_LOGIN_PATTERNS.find((p) => p.re.test(actor.login!));
        return {
            botType: known ?? pattern?.type ?? 'github-app',
            botName: actor.login,
        };
    }

    // 2. Known automation logins even when GitHub reports type 'User'
    //    (some self-hosted automation accounts are plain users).
    const known = KNOWN_BOT_LOGINS[actor.login.toLowerCase()];
    if (known) return { botType: known, botName: actor.login };

    return null;
}

/**
 * Classify a GitHub App identity (webhook `sender` or push `github_app`).
 * All GitHub Apps are automation, including ones that act on behalf of a
 * user — HEMS records the app identity as evidence.
 */
export function detectBotFromApp(
    app: { slug?: string | null; name?: string | null } | null | undefined
): BotMatch | null {
    if (!app || (!app.slug && !app.name)) return null;
    const name = app.slug ?? app.name!;
    return { botType: 'github-app', botName: name };
}

/**
 * Compute bot flags for persistence. `actor` is the GitHub author/pusher;
 * `app` is the GitHub App involved in the event (if any).
 */
export function classifyBotEvidence(
    actor: ActorLike | null | undefined,
    app?: { slug?: string | null; name?: string | null } | null
): {
    isBot: boolean;
    botType: BotType | null;
    botName: string | null;
    automationSource: string | null;
} {
    const bot = detectBotFromActor(actor) ?? detectBotFromApp(app);
    if (!bot) {
        return { isBot: false, botType: null, botName: null, automationSource: null };
    }
    return {
        isBot: true,
        botType: bot.botType,
        botName: bot.botName,
        automationSource: bot.botName,
    };
}
