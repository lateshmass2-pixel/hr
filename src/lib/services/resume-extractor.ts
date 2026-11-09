/**
 * Lightweight, NO-AI resume field extraction.
 *
 * Replaces the previous LLM-based parsing of candidate name / email.
 * Everything here is pure regex/heuristics so scoring never depends on
 * an AI model. Text is expected to come from the PDF parser
 * (pdf2json today, PyMuPDF optionally).
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
// Common personal-email / free providers are fine; we just grab the first hit.

/**
 * Extracts the first email address found in the resume text.
 */
export function extractEmail(text: string): string | null {
    if (!text) return null;
    const match = text.match(EMAIL_REGEX);
    return match ? match[0].trim() : null;
}

// Header / role / section words that mark the end of a name (or a line that
// isn't a name at all). Used to stop collecting name tokens.
const NON_NAME_TOKENS = new Set([
    // document headers
    "curriculum", "vitae", "resume", "cv", "profile", "summary", "objective",
    "contact", "address", "phone", "email", "mobile", "tel", "linkedin",
    "github", "portfolio", "website", "about",
    // common role / seniority words that often trail a name on the same line
    "engineer", "developer", "manager", "designer", "analyst", "consultant",
    "intern", "specialist", "lead", "architect", "scientist", "administrator",
    "officer", "director", "student", "graduate", "fresher", "senior", "junior",
    "software", "full", "stack", "frontend", "backend", "data",
]);

/** A token that could be part of a person's name: Title case or ALL-CAPS. */
function isNameToken(token: string): boolean {
    return /^[A-Z][a-zA-Z'’.\-]*$/.test(token) || /^[A-Z]{2,}$/.test(token);
}

/**
 * Heuristically extracts the candidate name from the top of the resume.
 *
 * Strategy: scan the first several lines; on each, collect the leading run of
 * name-like tokens (Title case or ALL-CAPS), stopping at a role/header word.
 * A real name needs at least two such tokens (first + last).
 */
export function extractName(text: string): string | null {
    if (!text) return null;

    const lines = text
        .split(/[\n\r]+/)
        .map((l) => l.trim())
        .filter(Boolean);

    for (const line of lines.slice(0, 12)) {
        // Skip lines that clearly aren't a name header.
        if (line.length < 3 || line.length > 80) continue;
        if (/[@\d]/.test(line)) continue;
        if (/https?:\/\//i.test(line)) continue;

        const tokens = line.split(/\s+/).filter(Boolean);

        // Collect leading name-like tokens, stopping at a role/header word.
        const nameTokens: string[] = [];
        for (const token of tokens) {
            const bare = token.toLowerCase().replace(/[^a-z]/g, "");
            if (NON_NAME_TOKENS.has(bare)) break;
            if (!isNameToken(token)) break;
            nameTokens.push(token);
            if (nameTokens.length === 4) break;
        }

        if (nameTokens.length >= 2) {
            return normalizeName(nameTokens.join(" "));
        }
    }

    return null;
}

/**
 * Fallback: derive a name from a "firstname.lastname@" style email when the
 * header couldn't be parsed (e.g. jane.doe@x.com -> "Jane Doe").
 */
function nameFromEmail(email: string): string | null {
    const local = (email.split("@")[0] || "");
    const parts = local
        .split(/[._\-+0-9]+/)
        .filter((p) => p.length > 1 && /^[a-zA-Z]+$/.test(p));

    if (parts.length >= 2) {
        return parts
            .slice(0, 3)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(" ");
    }
    return null;
}

function normalizeName(raw: string): string {
    return raw
        .split(/\s+/)
        .map((w) =>
            w.length > 1 && w === w.toUpperCase()
                ? w.charAt(0) + w.slice(1).toLowerCase()
                : w
        )
        .join(" ");
}

export interface ExtractedResumeFields {
    name: string | null;
    email: string | null;
}

/**
 * Convenience wrapper returning both name and email in one pass.
 */
export function extractResumeFields(text: string): ExtractedResumeFields {
    const email = extractEmail(text);
    // Prefer the header name; fall back to the email's local part if needed.
    const name = extractName(text) ?? (email ? nameFromEmail(email) : null);
    return { name, email };
}
