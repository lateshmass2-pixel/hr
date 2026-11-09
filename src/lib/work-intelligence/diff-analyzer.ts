// =============================================================================
// Work Intelligence — Deterministic Diff Analyzer (spec §12)
// =============================================================================
// Pure functions. Given file paths, per-file additions/deletions and the commit
// message, computes:
//   * per-file category (source/test/doc/config/generated/lockfile/migration/asset)
//   * deterministic commit-level change category
//   * meaningful-work score
//
// The AI layer may later refine categories, but raw deterministic evidence is
// always preserved and displayed (§12: "preserve the raw deterministic
// evidence").
// =============================================================================

import type { ChangeCategory, FileCategory } from './types';

export interface FileChange {
    path: string;
    status?: string;          // added | modified | removed | renamed | copied
    additions?: number;
    deletions?: number;
    changes?: number;
    previousPath?: string | null;
}

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|java|kt|c|h|cpp|cc|hpp|cs|go|rs|php|rb|swift|scala|dart|vue|svelte|sh|sql)$/i;
const DOCS_EXT = /\.(md|mdx|rst|txt|adoc|docx?|pdf)$/i;
const CONFIG_EXT = /\.(json|ya?ml|toml|ini|cfg|conf|env|editorconfig|gitignore|npmrc|nvmrc|babelrc|eslintrc|prettierrc)$/i;
/** next.config.ts, vitest.config.mts, tailwind.config.js … */
const CONFIG_CODE_EXT = /\.config\.(ts|tsx|js|jsx|mjs|cjs|mts)$/i;
const ASSET_EXT = /\.(png|jpe?g|gif|svg|ico|webp|bmp|avif|mp4|mov|webm|mp3|wav|ogg|ttf|otf|woff2?|eot)$/i;
const TEST_HINT = /(^|\/)(tests?|__tests__|spec|e2e)\//i;
const TEST_FILE_HINT = /[._-](test|spec)\.[^.]+$|\/(test|spec)\//i;

/** Classify a single file path into a category (spec §12). */
export function categorizeFile(path: string): FileCategory {
    const lower = path.toLowerCase();

    if (/package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$|poetry\.lock$|cargo\.lock$|composer\.lock$|go\.(sum|mod)$|gemfile\.lock$/i.test(lower)) {
        return 'lockfile';
    }
    if (/(^|\/)(migrations?|db\/migrate|prisma\/migrations|supabase\/migrations)\//i.test(lower)) {
        return 'migration';
    }
    if (/(^|\/)(dist|build|out|coverage|\.next|node_modules|generated|__generated__|auto-generated)(\/|$)/i.test(lower)
        || /\.d\.ts$/.test(lower) && /generated/i.test(lower)
        || /\.min\.(js|css)$/.test(lower)
        || lower.endsWith('.map')) {
        return 'generated';
    }
    if (TEST_FILE_HINT.test(lower) || TEST_HINT.test(lower)) {
        return 'test';
    }
    if (DOCS_EXT.test(lower) && !TEST_FILE_HINT.test(lower)) {
        return 'documentation';
    }
    if (CONFIG_EXT.test(lower)) {
        return 'configuration';
    }
    if (ASSET_EXT.test(lower)) {
        return 'asset';
    }
    if (CONFIG_CODE_EXT.test(lower)) {
        return 'configuration';
    }
    if (SOURCE_EXT.test(lower)) {
        return 'source';
    }
    return 'other';
}

export interface DiffSummary {
    filesChanged: number;
    additions: number;
    deletions: number;
    netLines: number;
    byCategory: Record<FileCategory, number>;
    /** additions+deletions per category — the weight behind "meaningful". */
    churnByCategory: Record<FileCategory, number>;
    sourceFiles: number;
    testFiles: number;
    documentationFiles: number;
    configurationFiles: number;
    generatedFiles: number;
    lockfileFiles: number;
    migrationFiles: number;
}

const EMPTY_CHURN: Record<FileCategory, number> = {
    source: 0, test: 0, documentation: 0, configuration: 0,
    generated: 0, lockfile: 0, migration: 0, asset: 0, other: 0,
};

/** Aggregate per-file changes into a deterministic summary. */
export function summarizeDiff(files: FileChange[]): DiffSummary {
    const byCategory = { ...EMPTY_CHURN };
    const churnByCategory = { ...EMPTY_CHURN };
    let additions = 0;
    let deletions = 0;

    for (const f of files) {
        const cat = categorizeFile(f.path);
        const a = Math.max(0, f.additions ?? 0);
        const d = Math.max(0, f.deletions ?? 0);
        additions += a;
        deletions += d;
        byCategory[cat] += 1;
        churnByCategory[cat] += a + d;
    }

    return {
        filesChanged: files.length,
        additions,
        deletions,
        netLines: additions - deletions,
        byCategory,
        churnByCategory,
        sourceFiles: byCategory.source,
        testFiles: byCategory.test,
        documentationFiles: byCategory.documentation,
        configurationFiles: byCategory.configuration,
        generatedFiles: byCategory.generated + byCategory.lockfile,
        lockfileFiles: byCategory.lockfile,
        migrationFiles: byCategory.migration,
    };
}

const BUGFIX_RE = /\b(fix|bugfix|fixes|bug|patch|resolve[sd]?|repair|crash|regression|hotfix)\b/i;
const FEATURE_RE = /\b(feat|feature|add[s]?|implement[s]?|support|introduce[s]?|create[sd]? (?:a |an |the )?(?:new|new))\b/i;
const REFACTOR_RE = /\b(refactor|restructure|clean ?up|simplify|extract|move|rename|tidy)\b/i;
const TEST_RE = /\b(test|tests|spec|coverage|unit)\b/i;
const DOCS_RE = /\b(docs?|documentation|readme|changelog|comment[s]?)\b/i;
const CONFIG_RE = /\b(config|settings|env|metadata|ci|docker|deploy)\b/i;
const DEPENDENCY_RE = /\b(deps?|dependencies|upgrade|update|bump|pin)\b/i;
const FORMATTING_RE = /\b(format|style|lint|prettier|whitespace|trailing|semicolons?)\b/i;

/**
 * Deterministic commit-level classification. Order matters: signals are
 * evaluated by strength of evidence in the diff itself first, then the
 * message. When the diff clearly says one thing and the message another, the
 * diff wins for lockfile/generated (indisputable), and message hints refine
 * source-code commits.
 */
export function classifyChange(
    files: FileChange[],
    message: string
): { category: ChangeCategory; rationale: string } {
    const summary = summarizeDiff(files);
    const total = summary.filesChanged || 1;
    const firstLine = message.split('\n')[0] ?? '';

    // Indisputable diff-driven cases first.
    if (summary.byCategory.lockfile > 0) {
        const lockDominant = summary.byCategory.lockfile / total >= 0.5;
        if (lockDominant) {
            return {
                category: 'DEPENDENCY',
                rationale: `${summary.byCategory.lockfile}/${total} changed files are lockfiles`,
            };
        }
    }
    if (summary.byCategory.generated > 0 && summary.byCategory.source === 0 && summary.byCategory.test === 0) {
        return {
            category: 'GENERATED',
            rationale: `${summary.byCategory.generated} generated/lockfile file(s) changed with no source changes`,
        };
    }

    if (total > 0
        && summary.byCategory.source === 0
        && summary.byCategory.test === 0
        && summary.byCategory.migration === 0) {
        if (summary.byCategory.documentation > 0 && summary.byCategory.configuration === 0) {
            return {
                category: 'DOCUMENTATION',
                rationale: 'only documentation files changed',
            };
        }
        if (summary.byCategory.configuration > 0 && summary.byCategory.documentation === 0) {
            return {
                category: 'CONFIGURATION',
                rationale: 'only configuration files changed',
            };
        }
    }

    // Diff has real code; refine using the message.
    const hasSource = summary.byCategory.source > 0 || summary.byCategory.migration > 0;
    const hasTest = summary.byCategory.test > 0;

    if (hasTest && !hasSource) {
        return {
            category: 'TESTING',
            rationale: 'only test files changed',
        };
    }

    if (hasTest && BUGFIX_RE.test(firstLine)) {
        return {
            category: 'TESTING',
            rationale: 'test changes accompanying a fix (message signals bug fix)',
        };
    }

    if (BUGFIX_RE.test(firstLine)) {
        return {
            category: 'BUG_FIX',
            rationale: `commit message signals a fix; ${summary.byCategory.source} source file(s) changed`,
        };
    }
    if (FEATURE_RE.test(firstLine)) {
        return {
            category: 'FEATURE',
            rationale: `commit message signals a feature; ${summary.byCategory.source} source file(s) changed`,
        };
    }
    if (TEST_RE.test(firstLine) && hasTest) {
        return {
            category: 'TESTING',
            rationale: 'message and diff both point to tests',
        };
    }
    if (DOCS_RE.test(firstLine) && summary.byCategory.documentation > 0) {
        return {
            category: 'DOCUMENTATION',
            rationale: 'message and diff point to documentation',
        };
    }
    if (DEPENDENCY_RE.test(firstLine) && summary.byCategory.configuration > 0) {
        return {
            category: 'DEPENDENCY',
            rationale: 'message signals dependency change; configuration files changed',
        };
    }
    if (FORMATTING_RE.test(firstLine)
        && summary.additions + summary.deletions <= total * 6) {
        return {
            category: 'FORMATTING',
            rationale: 'message signals formatting and per-file churn is small',
        };
    }
    if (REFACTOR_RE.test(firstLine)) {
        return {
            category: 'REFACTOR',
            rationale: 'commit message signals refactoring',
        };
    }
    if (CONFIG_RE.test(firstLine) && summary.byCategory.configuration > 0) {
        return {
            category: 'CONFIGURATION',
            rationale: 'message and diff point to configuration',
        };
    }
    if (hasSource) {
        return {
            category: 'UNKNOWN',
            rationale: 'source files changed without a clear message signal',
        };
    }
    return {
        category: 'UNKNOWN',
        rationale: 'no dominant category detected',
    };
}

/**
 * Meaningful-work score (spec §13): commit count is never the primary metric.
 * 0–100, deterministic:
 *   * source + test churn is the bulk of the score
 *   * lockfiles/generated/assets add nothing
 *   * documentation/migration add a little
 */
export function scoreMeaningfulWork(summary: DiffSummary): number {
    const codeChurn =
        summary.churnByCategory.source + summary.churnByCategory.test;
    const migrationChurn = summary.churnByCategory.migration;
    const docChurn = summary.churnByCategory.documentation;

    // Commit count is never the metric (spec §13). ANY N trivial commits
    // together must never out-weigh ONE substantial feature — so the score
    // compresses at the low end: 1 churn → ~0.4, 4 churn → ~1.4,
    // 20 churn → ~5, 50 churn → ~10, 150 → ~23, 400 → ~42 (with bonuses
    // proportional to churn, never flat).
    let score = 42 * (1 - Math.exp(-codeChurn / 70));
    score += 10 * (1 - Math.exp(-migrationChurn / 40));
    score += 8 * (1 - Math.exp(-docChurn / 50));
    const presence = 1 - Math.exp(-codeChurn / 25);
    if (summary.byCategory.test > 0) score += 10 * presence;
    if (summary.byCategory.source > 0) score += 4 * presence;

    return Math.round(Math.min(100, score) * 100) / 100;
}

/** True when a commit contains zero meaningful changes by the rules above. */
export function isMeaningfulChange(summary: DiffSummary): boolean {
    return (
        summary.churnByCategory.source > 0 ||
        summary.churnByCategory.test > 0 ||
        summary.churnByCategory.migration > 0
    );
}
