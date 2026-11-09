// =============================================================================
// Work Intelligence — AI / Coding-Agent Provenance (spec §11)
// =============================================================================
// EXPLICIT EVIDENCE ONLY. This module never guesses from code style. AI-agent
// involvement is recorded only when there is documented provenance:
//
//   1. Co-authored-by trailers naming a known agent
//      (Claude Code, GitHub Copilot, Cursor, Codex, Windsurf, Gemini CLI)
//   2. GitHub App identity (e.g. copilot-pf[bot] on PRs)
//   3. Explicit provenance markers in tool config/commit footers
//      (e.g. "Generated with Claude Code ... Co-Authored-By: Claude")
//   4. Explicitly labeled as inference otherwise — never silently asserted.
// =============================================================================

import type { AgentType, AgentDetectionBasis } from './types';

export interface AgentDetection {
    agentType: AgentType;
    agentName: string | null;
    basis: AgentDetectionBasis;
    confidence: 'high' | 'medium' | 'low';
    evidence: Record<string, unknown>;
}

// --- Co-author trailer parsing -------------------------------------------------

export interface CoAuthor {
    name: string;
    email: string | null;
}

const CO_AUTHOR_RE = /co-authored-by:\s*([^<]+?)\s*(?:<([^>]+)>)?\s*$/gim;

/** Parse `Co-authored-by: Name <email>` trailers from a commit message. */
export function parseCoAuthors(message: string): CoAuthor[] {
    const out: CoAuthor[] = [];
    for (const m of message.matchAll(CO_AUTHOR_RE)) {
        out.push({ name: (m[1] ?? '').trim(), email: (m[2] ?? '').trim() || null });
    }
    // Dedupe by name+email
    const seen = new Set<string>();
    return out.filter((c) => {
        const key = `${c.name.toLowerCase()}|${(c.email ?? '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// --- Known agent identities ----------------------------------------------------

const AGENT_NAME_PATTERNS: Array<{ re: RegExp; type: AgentType; name: string }> = [
    { re: /^claude\b/i, type: 'CLAUDE', name: 'Claude' },
    { re: /^claude code$/i, type: 'CLAUDE', name: 'Claude Code' },
    { re: /^anthropic(\s|\(|$)/i, type: 'CLAUDE', name: 'Anthropic Claude' },
    { re: /^copilot\b/i, type: 'COPILOT', name: 'GitHub Copilot' },
    { re: /^github copilot/i, type: 'COPILOT', name: 'GitHub Copilot' },
    { re: /^cursor(\s*agent)?$/i, type: 'CURSOR', name: 'Cursor' },
    { re: /^codex\b/i, type: 'CODEX', name: 'OpenAI Codex' },
    { re: /^openai codex/i, type: 'CODEX', name: 'OpenAI Codex' },
    { re: /^gemini(\s*codeassist)?$/i, type: 'CUSTOM_AGENT', name: 'Gemini Code Assist' },
    { re: /^windsurf\b/i, type: 'CUSTOM_AGENT', name: 'Windsurf' },
    { re: /^aider\b/i, type: 'CUSTOM_AGENT', name: 'Aider' },
    { re: /^devin\b/i, type: 'CUSTOM_AGENT', name: 'Devin' },
];

/**
 * Identify an agent from a co-author name/email.
 * Unknown co-authors are NOT agents — they're just people (spec §11).
 */
export function matchAgentFromCoAuthor(co: CoAuthor): AgentDetection | null {
    const hay = `${co.name} ${co.email ?? ''}`.toLowerCase();
    for (const p of AGENT_NAME_PATTERNS) {
        if (p.re.test(co.name) || (co.email && p.re.test(co.email))) {
            return {
                agentType: p.type,
                agentName: p.name,
                basis: 'co_author',
                confidence: 'high',
                evidence: {
                    co_author: co.name + (co.email ? ` <${co.email}>` : ''),
                },
            };
        }
    }
    // A co-author email at a known agent domain is explicit provenance too.
    if (co.email) {
        if (/@(anthropic\.com|openai\.com|cursor\.com)$/i.test(co.email)) {
            return {
                agentType: 'UNKNOWN_AGENT',
                agentName: co.name,
                basis: 'co_author',
                confidence: 'medium',
                evidence: { co_author: `${co.name} <${co.email}>`, domain: co.email.split('@')[1] },
            };
        }
        if (/@users\.noreply\.github\.com$/i.test(co.email) && /claude|copilot|cursor|codex|devin|aider/i.test(co.name)) {
            return {
                agentType: 'UNKNOWN_AGENT',
                agentName: co.name,
                basis: 'co_author',
                confidence: 'medium',
                evidence: { co_author: `${co.name} <${co.email}>` },
            };
        }
    }
    void hay;
    return null;
}

/**
 * Scan a commit message (including its trailers) for explicit agent
 * provenance. Detects both Co-authored-by trailers and provenance footers
 * like "🤖 Generated with [Claude Code]" / "Co-Authored-By: Claude ...
 */
export function detectAgentsFromMessage(message: string): AgentDetection[] {
    const detections: AgentDetection[] = [];

    for (const co of parseCoAuthors(message)) {
        const m = matchAgentFromCoAuthor(co);
        if (m) detections.push(m);
    }

    // Explicit "Generated with X" / "Produced by X" footers.
    const generatedWith = message.matchAll(
        /generated with (?:\[)?([\w .-]+?)(?:\])?$/gim
    );
    for (const m of generatedWith) {
        const tool = (m[1] ?? '').trim();
        const agent = matchAgentFromCoAuthor({ name: tool, email: null });
        if (agent) {
            agent.basis = 'explicit_provenance';
            detections.push(agent);
        }
    }

    return dedupeDetections(detections);
}

/** GitHub App identity → agent (e.g. Copilot app, Claude app). */
export function detectAgentFromApp(
    app: { slug?: string | null; name?: string | null } | null | undefined
): AgentDetection | null {
    if (!app) return null;
    const slug = (app.slug ?? app.name ?? '').toLowerCase();
    if (!slug) return null;
    if (slug.includes('copilot')) {
        return {
            agentType: 'COPILOT',
            agentName: 'GitHub Copilot',
            basis: 'app_identity',
            confidence: 'high',
            evidence: { app_slug: slug },
        };
    }
    if (slug.includes('claude')) {
        return {
            agentType: 'CLAUDE',
            agentName: 'Claude (GitHub App)',
            basis: 'app_identity',
            confidence: 'high',
            evidence: { app_slug: slug },
        };
    }
    if (slug.includes('cursor')) {
        return {
            agentType: 'CURSOR',
            agentName: 'Cursor (GitHub App)',
            basis: 'app_identity',
            confidence: 'high',
            evidence: { app_slug: slug },
        };
    }
    if (slug.includes('codex')) {
        return {
            agentType: 'CODEX',
            agentName: 'Codex (GitHub App)',
            basis: 'app_identity',
            confidence: 'high',
            evidence: { app_slug: slug },
        };
    }
    return null;
}

function dedupeDetections(list: AgentDetection[]): AgentDetection[] {
    const byKey = new Map<string, AgentDetection>();
    for (const d of list) {
        const key = `${d.agentType}|${d.agentName ?? ''}|${d.basis}`;
        if (!byKey.has(key)) byKey.set(key, d);
    }
    return [...byKey.values()];
}
