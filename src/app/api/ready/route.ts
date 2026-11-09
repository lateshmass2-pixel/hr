/**
 * GET /api/ready — readiness probe.
 *
 * Answers: can this instance actually serve traffic right now? Unlike
 * /api/health, this DOES check dependencies, so a failure should remove the
 * instance from the load balancer rather than restart it.
 *
 * Response shape is deliberately terse. A readiness endpoint is unauthenticated
 * (probes cannot present credentials), so it must not become a reconnaissance
 * tool: it reports which named checks passed and how long they took, never
 * driver error text, hostnames, versions, or configuration values.
 *
 * 200 -> ready.  503 -> not ready, do not route traffic here.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerEnv, isBillingConfigured, isEmailConfigured } from '@/lib/env';
import { logger, newRequestId } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Give up on a dependency rather than hang the probe. */
const CHECK_TIMEOUT_MS = 3000;

interface CheckResult {
    name: string;
    ok: boolean;
    durationMs: number;
    /** Coarse reason, safe to expose. Never a raw driver message. */
    reason?: 'timeout' | 'error' | 'not_configured';
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error('timeout')), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function runCheck(name: string, fn: () => Promise<void>): Promise<CheckResult> {
    const startedAt = Date.now();
    try {
        await withTimeout(fn(), CHECK_TIMEOUT_MS);
        return { name, ok: true, durationMs: Date.now() - startedAt };
    } catch (error) {
        const isTimeout = error instanceof Error && error.message === 'timeout';
        // Full detail goes to logs, where it is access-controlled.
        logger.error(`Readiness check failed: ${name}`, error, {
            route: 'GET /api/ready',
            check: name,
        });
        return {
            name,
            ok: false,
            durationMs: Date.now() - startedAt,
            reason: isTimeout ? 'timeout' : 'error',
        };
    }
}

/**
 * Configuration is checked first: if required env is missing the process should
 * not have booted at all (src/instrumentation.ts), so this failing indicates
 * something is badly wrong.
 */
async function checkConfig(): Promise<void> {
    getServerEnv();
}

/**
 * Cheapest possible round trip that proves the database is reachable AND that
 * our credentials work. `head: true` with an exact count fetches no rows.
 */
async function checkDatabase(): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true });

    if (error) throw new Error(error.message);
}

export async function GET() {
    const requestId = newRequestId();
    const startedAt = Date.now();

    const checks: CheckResult[] = [];

    checks.push(await runCheck('config', checkConfig));

    // Only probe the database once configuration is known good — otherwise the
    // failure is guaranteed and the message would be misleading.
    if (checks[0].ok) {
        checks.push(await runCheck('database', checkDatabase));
    } else {
        checks.push({ name: 'database', ok: false, durationMs: 0, reason: 'not_configured' });
    }

    // Optional integrations are REPORTED but do not gate readiness: an instance
    // without Stripe configured can still serve every non-billing request.
    const optional = {
        billing: isBillingConfigured(),
        email: isEmailConfigured(),
    };

    const ready = checks.every((check) => check.ok);
    const durationMs = Date.now() - startedAt;

    if (!ready) {
        logger.warn('Readiness probe reported NOT ready', {
            requestId,
            route: 'GET /api/ready',
            durationMs,
            failed: checks.filter((c) => !c.ok).map((c) => c.name),
        });
    }

    return NextResponse.json(
        {
            status: ready ? 'ready' : 'not_ready',
            checks,
            optional,
            durationMs,
            timestamp: new Date().toISOString(),
        },
        {
            status: ready ? 200 : 503,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
    );
}
