/**
 * Next.js instrumentation hook — runs once per server process at startup,
 * before any request is handled.
 *
 * Validating configuration here converts "mysterious 500 in production three
 * hours after deploy" into "the process refused to start and told you which
 * variable is wrong".
 */

export async function register(): Promise<void> {
    // Only meaningful on the Node.js server runtime. The edge runtime has a
    // different (smaller) env surface and no access to server-only secrets.
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { validateServerEnv } = await import('@/lib/env');
    validateServerEnv();
}
