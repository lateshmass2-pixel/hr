#!/usr/bin/env node
/**
 * Lint ratchet.
 *
 * The codebase currently has a backlog of ESLint errors (mostly
 * `no-explicit-any`). Making lint a hard gate today would mean either failing
 * every build or fixing hundreds of unrelated files in one commit — both bad.
 *
 * Instead this enforces a one-way ratchet: the error count per rule may go
 * DOWN but never UP. New code has to be clean; the backlog gets paid off
 * incrementally, and the baseline is re-tightened automatically as it shrinks.
 *
 *   node scripts/lint-ratchet.mjs           # check against baseline (CI)
 *   node scripts/lint-ratchet.mjs --update  # rewrite baseline after fixing
 *
 * Delete this script (and switch CI to plain `eslint`) once the baseline
 * reaches zero.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_PATH = new URL('../.eslint-baseline.json', import.meta.url);
const shouldUpdate = process.argv.includes('--update');

function runEslint() {
    let stdout;
    try {
        stdout = execFileSync('npx', ['eslint', '.', '-f', 'json'], {
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
        });
    } catch (error) {
        // ESLint exits non-zero when it finds errors; the JSON report is still
        // on stdout and is what we actually want.
        if (error.stdout) {
            stdout = error.stdout;
        } else {
            console.error('Failed to run ESLint:', error.message);
            process.exit(1);
        }
    }
    return JSON.parse(stdout);
}

function countErrorsByRule(report) {
    const byRule = {};
    let total = 0;
    for (const file of report) {
        for (const message of file.messages) {
            if (message.severity !== 2) continue; // errors only; warnings are advisory
            const rule = message.ruleId ?? '(no-rule)';
            byRule[rule] = (byRule[rule] ?? 0) + 1;
            total += 1;
        }
    }
    return { byRule, total };
}

const report = runEslint();
const { byRule, total } = countErrorsByRule(report);

if (shouldUpdate || !existsSync(BASELINE_PATH)) {
    const baseline = {
        _comment:
            'Lint ratchet baseline. Error counts may decrease but never increase. ' +
            'Regenerate with: npm run lint:baseline. Goal: delete this file.',
        total,
        byRule: Object.fromEntries(Object.entries(byRule).sort(([a], [b]) => a.localeCompare(b))),
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
    console.log(`Baseline written: ${total} errors across ${Object.keys(byRule).length} rules.`);
    process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

const regressions = [];
const improvements = [];
const allRules = new Set([...Object.keys(baseline.byRule ?? {}), ...Object.keys(byRule)]);

for (const rule of [...allRules].sort()) {
    const allowed = baseline.byRule?.[rule] ?? 0;
    const actual = byRule[rule] ?? 0;
    if (actual > allowed) regressions.push({ rule, allowed, actual });
    else if (actual < allowed) improvements.push({ rule, allowed, actual });
}

if (regressions.length > 0) {
    console.error('\nLint ratchet FAILED — new lint errors were introduced:\n');
    for (const { rule, allowed, actual } of regressions) {
        console.error(`  ${rule}: ${actual} (baseline allows ${allowed}, +${actual - allowed})`);
    }
    console.error('\nFix the new errors. Do not raise the baseline to make this pass.');
    console.error('Run `npx eslint .` to see them.\n');
    process.exit(1);
}

console.log(`Lint ratchet OK — ${total} errors (baseline ${baseline.total}).`);

if (improvements.length > 0) {
    const fixed = improvements.reduce((sum, i) => sum + (i.allowed - i.actual), 0);
    console.log(`\n${fixed} error(s) fixed since the baseline. Tightening it:`);
    for (const { rule, allowed, actual } of improvements) {
        console.log(`  ${rule}: ${allowed} -> ${actual}`);
    }
    const updated = {
        ...baseline,
        total,
        byRule: Object.fromEntries(
            Object.entries(byRule).sort(([a], [b]) => a.localeCompare(b))
        ),
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(updated, null, 2) + '\n');
    console.log('\nBaseline tightened — commit .eslint-baseline.json with your change.');
}
