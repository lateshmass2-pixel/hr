// =============================================================================
// Work Intelligence — AI Summary Layer (spec §21)
// =============================================================================
// Uses the existing HEMS AI infrastructure (Groq via src/lib/ai) to summarize
// recorded evidence. HARD RULES enforced by prompt + post-processing:
//   * The model only sees DB-backed facts (counts, categories, statuses).
//   * It must classify each statement FACT / INFERENCE / UNKNOWN.
//   * It must never claim who physically typed code, never accuse, and never
//     invent numbers. Facts are provided; the model rephrases and flags.
//   * If no AI key is configured, callers get a deterministic fallback built
//     from the same facts — no fabricated content.
// =============================================================================

import { logger } from '@/lib/observability/logger';
import type { DailyReportResult } from './reports';

export type AiStatementClass = 'FACT' | 'INFERENCE' | 'UNKNOWN';

export interface AiWorkSummary {
    summary: string;
    statements: Array<{ cls: AiStatementClass; text: string }>;
    generatedByAi: boolean;
    generatedAt: string;
}

interface EmployeeInfo {
    fullName: string;
    dateLabel: string;
}

const SYSTEM_PROMPT = `You are HEMS Work Intelligence, an evidence summarizer inside an HR platform.
You receive VERIFIED DATABASE FACTS about one employee's development activity for one day.

ABSOLUTE RULES:
1. Every statement you write must be classifiable as FACT, INFERENCE, or UNKNOWN.
2. FACT = directly stated in the input numbers. Never invent numbers.
3. INFERENCE = a careful pattern observation (e.g. "activity appears concentrated in a short window"). Phrase with "appears".
4. UNKNOWN = anything about who physically typed code, intent, or honesty. If relevant, say HEMS cannot determine it.
5. NEVER accuse anyone of cheating, faking work, or misusing AI.
6. NEVER claim AI wrote code unless the input explicitly lists a detected agent.
7. AI-assisted development is legitimate; describe it neutrally when detected.
8. Keep the summary under 180 words. No markdown. Plain sentences.

Output STRICT JSON:
{"summary": "...", "statements": [{"cls": "FACT|INFERENCE|UNKNOWN", "text": "..."}]}`;

function buildFactsBlock(
    employee: EmployeeInfo,
    report: DailyReportResult
): string {
    const c = report.counts;
    const checklist = Object.entries(report.checklist)
        .map(([k, v]) => `- ${k}: ${v ? 'yes' : 'no'}`)
        .join('\n');
    const anomalies = report.anomalies.length
        ? report.anomalies.map((a) => `- [${a.severity}] ${a.reason}`).join('\n')
        : '- none detected';
    const agents = report.automation.agents.length
        ? report.automation.agents.map((a) => `- ${a.agentType}${a.agentName ? ` (${a.agentName})` : ''}, basis: ${a.basis}, count: ${a.count}`).join('\n')
        : '- none detected';
    const bots = report.automation.bots.length
        ? report.automation.bots.map((b) => `- ${b.botName} (${b.botType}), count: ${b.count}`).join('\n')
        : '- none detected';

    return `EMPLOYEE: ${employee.fullName}
DATE: ${employee.dateLabel}
AUTHENTICITY STATUS: ${report.status}
STATUS REASON: ${report.reason}

COUNTS (database facts):
- repositories: ${c.repositories}
- commits: ${c.commits}
- pushes: ${c.pushes}
- pull requests: ${c.pullRequests}
- reviews: ${c.reviews}
- CI runs: ${c.ciRuns}
- files changed: ${c.filesChanged}

WORK AREAS: ${report.workAreas.join(', ') || 'none recorded'}

EVIDENCE CHECKLIST:
${checklist}

ANOMALIES:
${anomalies}

DETECTED AI AGENTS (explicit provenance only):
${agents}

DETECTED BOTS/AUTOMATION:
${bots}`;
}

function extractJson(text: string): { summary: string; statements: Array<{ cls: string; text: string }> } | null {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.summary === 'string' && Array.isArray(parsed.statements)) {
            return parsed;
        }
        return null;
    } catch {
        const m = trimmed.match(/\{[\s\S]*\}/);
        if (m) {
            try {
                return JSON.parse(m[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

const CLS_VALUES = new Set(['FACT', 'INFERENCE', 'UNKNOWN']);

/** Guardrail: strip any accusation-style wording the model might produce. */
function sanitize(text: string): string {
    return text
        .replace(/\b(cheat(ed|ing)?|faked?|fraud|stole|stolen|plagiaris(ed|ze|ing))\b/gi, 'questionable')
        .replace(/\bdefinitely (used|wrote)\b/gi, 'may have used');
}

/** Deterministic fallback — same structure, no model involved. */
function fallbackSummary(
    employee: EmployeeInfo,
    report: DailyReportResult
): AiWorkSummary {
    const c = report.counts;
    const lines: Array<{ cls: AiStatementClass; text: string }> = [
        { cls: 'FACT', text: `${c.commits} commit(s), ${c.pushes} push(es), ${c.pullRequests} pull request(s) and ${c.reviews} review(s) were recorded for ${employee.dateLabel}.` },
        { cls: 'FACT', text: `${c.filesChanged} files were changed across ${c.repositories} repository(ies).` },
    ];
    if (report.workAreas.length) {
        lines.push({ cls: 'FACT', text: `Recorded work areas: ${report.workAreas.join(', ')}.` });
    }
    if (report.automation.agents.length) {
        const names = report.automation.agents.map((a) => a.agentName ?? a.agentType).join(', ');
        lines.push({ cls: 'FACT', text: `AI-assisted activity was detected via explicit provenance (${names}).` });
        lines.push({ cls: 'UNKNOWN', text: 'HEMS cannot determine how much of the code was produced by the AI assistant versus the employee.' });
    }
    if (report.anomalies.length) {
        lines.push({ cls: 'INFERENCE', text: `Some activity patterns warrant review: ${report.anomalies.map((a) => a.reason).join('; ')}.` });
    }
    lines.push({ cls: 'UNKNOWN', text: 'HEMS cannot determine who physically typed the code; provenance evidence is recorded and available for review.' });
    return {
        summary: lines.map((l) => l.text).join(' '),
        statements: lines,
        generatedByAi: false,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Generate an AI work summary. Falls back to the deterministic summary when
 * no API key is configured or the model call fails — evidence display must
 * never break (§26).
 */
export async function generateAiWorkSummary(
    employee: EmployeeInfo,
    report: DailyReportResult
): Promise<AiWorkSummary> {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const model = 'llama-3.1-8b-instant';
    if (!apiKey) return fallbackSummary(employee, report);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                max_tokens: 600,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: buildFactsBlock(employee, report) },
                ],
            }),
            signal: controller.signal,
        });
        if (!res.ok) {
            logger.warn('AI summary request failed', { status: res.status });
            return fallbackSummary(employee, report);
        }
        const body = await res.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content ?? '';
        const parsed = extractJson(content);
        if (!parsed) {
            logger.warn('AI summary returned unparseable JSON');
            return fallbackSummary(employee, report);
        }

        const statements = parsed.statements
            .filter((s) => s && typeof s.text === 'string' && CLS_VALUES.has(s.cls))
            .slice(0, 12)
            .map((s) => ({
                cls: s.cls as AiStatementClass,
                text: sanitize(s.text).slice(0, 500),
            }));

        return {
            summary: sanitize(parsed.summary).slice(0, 2000),
            statements,
            generatedByAi: true,
            generatedAt: new Date().toISOString(),
        };
    } catch (err) {
        logger.error('AI summary generation failed', err);
        return fallbackSummary(employee, report);
    } finally {
        clearTimeout(timer);
    }
}
