// =============================================================================
// Work Intelligence — Diff analyzer tests (spec §27)
// =============================================================================
import { describe, it, expect } from 'vitest'
import {
    categorizeFile,
    summarizeDiff,
    classifyChange,
    scoreMeaningfulWork,
    isMeaningfulChange,
} from '@/lib/work-intelligence/diff-analyzer'

describe('file categorization', () => {
    it('classifies source files', () => {
        expect(categorizeFile('src/app/page.tsx')).toBe('source')
        expect(categorizeFile('lib/utils.py')).toBe('source')
        expect(categorizeFile('src/main.go')).toBe('source')
    })

    it('classifies test files (including source extensions)', () => {
        expect(categorizeFile('src/app/page.test.tsx')).toBe('test')
        expect(categorizeFile('tests/unit/foo.spec.ts')).toBe('test')
        expect(categorizeFile('src/__tests__/helper.ts')).toBe('test')
        expect(categorizeFile('e2e/login.test.ts')).toBe('test')
    })

    it('classifies documentation', () => {
        expect(categorizeFile('README.md')).toBe('documentation')
        expect(categorizeFile('docs/guide.mdx')).toBe('documentation')
    })

    it('classifies configuration', () => {
        expect(categorizeFile('tsconfig.json')).toBe('configuration')
        expect(categorizeFile('.github/workflows/ci.yml')).toBe('configuration')
    })

    it('classifies lockfiles (before the generic .json rule)', () => {
        expect(categorizeFile('package-lock.json')).toBe('lockfile')
        expect(categorizeFile('yarn.lock')).toBe('lockfile')
        expect(categorizeFile('pnpm-lock.yaml')).toBe('lockfile')
    })

    it('classifies migrations', () => {
        expect(categorizeFile('supabase/migrations/009_followup.sql')).toBe('migration')
        expect(categorizeFile('prisma/migrations/2024_add_users/migration.sql')).toBe('migration')
    })

    it('classifies generated/build output and assets', () => {
        expect(categorizeFile('dist/bundle.min.js')).toBe('generated')
        expect(categorizeFile('.next/static/chunk.map')).toBe('generated')
        expect(categorizeFile('public/logo.svg')).toBe('asset')
    })
})

describe('diff summarization', () => {
    const files = [
        { path: 'src/api/auth.ts', additions: 40, deletions: 5 },
        { path: 'src/api/auth.test.ts', additions: 30, deletions: 0 },
        { path: 'package-lock.json', additions: 500, deletions: 200 },
        { path: 'README.md', additions: 10, deletions: 2 },
    ]

    it('aggregates counts and per-category churn', () => {
        const s = summarizeDiff(files)
        expect(s.filesChanged).toBe(4)
        expect(s.additions).toBe(580)
        expect(s.deletions).toBe(207)
        expect(s.netLines).toBe(373)
        expect(s.sourceFiles).toBe(1)
        expect(s.testFiles).toBe(1)
        expect(s.lockfileFiles).toBe(1)
        expect(s.documentationFiles).toBe(1)
        expect(s.churnByCategory.source).toBe(45)
        expect(s.churnByCategory.lockfile).toBe(700)
    })
})

describe('commit classification (deterministic)', () => {
    it('classifies lockfile-only commits as DEPENDENCY', () => {
        const { category } = classifyChange(
            [{ path: 'package-lock.json', additions: 900, deletions: 100 }],
            'chore: update deps'
        )
        expect(category).toBe('DEPENDENCY')
    })

    it('classifies generated-only commits as GENERATED', () => {
        const { category } = classifyChange(
            [
                { path: 'dist/app.min.js', additions: 2000, deletions: 0 },
                { path: 'dist/app.min.js.map', additions: 5000, deletions: 0 },
            ],
            'build: rebuild'
        )
        expect(category).toBe('GENERATED')
    })

    it('classifies docs-only commits as DOCUMENTATION', () => {
        const { category } = classifyChange(
            [{ path: 'docs/setup.md', additions: 60, deletions: 10 }],
            'docs: setup guide'
        )
        expect(category).toBe('DOCUMENTATION')
    })

    it('classifies config-only commits as CONFIGURATION', () => {
        const { category } = classifyChange(
            [{ path: 'next.config.ts', additions: 5, deletions: 1 }],
            'chore: tweak config'
        )
        expect(category).toBe('CONFIGURATION')
    })

    it('classifies test-only commits as TESTING', () => {
        const { category } = classifyChange(
            [{ path: 'src/api/auth.test.ts', additions: 80, deletions: 3 }],
            'test: cover token refresh'
        )
        expect(category).toBe('TESTING')
    })

    it('uses commit message signal for bug fixes with source changes', () => {
        const { category } = classifyChange(
            [{ path: 'src/api/auth.ts', additions: 12, deletions: 4 }],
            'fix: crash on expired token'
        )
        expect(category).toBe('BUG_FIX')
    })

    it('uses commit message signal for features', () => {
        const { category } = classifyChange(
            [{ path: 'src/api/payments.ts', additions: 120, deletions: 0 }],
            'feat: add refund endpoint'
        )
        expect(category).toBe('FEATURE')
    })

    it('falls back to UNKNOWN for source changes without a clear signal', () => {
        const { category } = classifyChange(
            [{ path: 'src/api/thing.ts', additions: 30, deletions: 20 }],
            'update thing'
        )
        expect(category).toBe('UNKNOWN')
    })

    it('classifies formatting commits with tiny churn', () => {
        const { category } = classifyChange(
            [
                { path: 'src/a.ts', additions: 2, deletions: 2 },
                { path: 'src/b.ts', additions: 1, deletions: 1 },
            ],
            'style: apply prettier'
        )
        expect(category).toBe('FORMATTING')
    })
})

describe('meaningful work scoring (commit count is never the metric)', () => {
    it('scores real source+test work high', () => {
        const score = scoreMeaningfulWork(summarizeDiff([
            { path: 'src/feature.ts', additions: 150, deletions: 10 },
            { path: 'src/feature.test.ts', additions: 90, deletions: 0 },
        ]))
        expect(score).toBeGreaterThan(50)
    })

    it('scores pure lockfile changes at zero', () => {
        const score = scoreMeaningfulWork(summarizeDiff([
            { path: 'package-lock.json', additions: 5000, deletions: 2000 },
        ]))
        expect(score).toBe(0)
    })

    it('scores generated-only changes at zero', () => {
        const score = scoreMeaningfulWork(summarizeDiff([
            { path: 'dist/bundle.min.js', additions: 9999, deletions: 0 },
        ]))
        expect(score).toBe(0)
    })

    it('two real feature commits outscore twenty formatting commits (spec §13 example)', () => {
        const twoFeatures = [
            scoreMeaningfulWork(summarizeDiff([
                { path: 'src/a.ts', additions: 200, deletions: 50 },
                { path: 'src/a.test.ts', additions: 80 },
            ])),
            scoreMeaningfulWork(summarizeDiff([
                { path: 'src/b.ts', additions: 150, deletions: 30 },
            ])),
        ].reduce((a, b) => a + b, 0)

        const twentyFormats = Array.from({ length: 20 }, () =>
            scoreMeaningfulWork(summarizeDiff([
                { path: 'src/x.ts', additions: 2, deletions: 2 },
            ]))
        ).reduce((a, b) => a + b, 0)

        expect(twoFeatures).toBeGreaterThan(twentyFormats)
    })

    it('isMeaningfulChange mirrors the score rules', () => {
        expect(isMeaningfulChange(summarizeDiff([
            { path: 'src/a.ts', additions: 10 },
        ]))).toBe(true)
        expect(isMeaningfulChange(summarizeDiff([
            { path: 'package-lock.json', additions: 10 },
        ]))).toBe(false)
        expect(isMeaningfulChange(summarizeDiff([
            { path: 'supabase/migrations/001.sql', additions: 40 },
        ]))).toBe(true)
    })
})
