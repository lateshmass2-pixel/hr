import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Environment validation gates process startup, and one of its rules exists
 * specifically to prevent a real incident that already happened in this
 * codebase: outbound mail being redirected to a hardcoded personal address in
 * production, which leaked temporary passwords and meant employees never
 * received their credentials.
 *
 * env.ts caches after the first successful parse, so each test resets the
 * module registry and re-imports.
 */

const VALID_BASE = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

let originalEnv: NodeJS.ProcessEnv;

/** Replace process.env with only the keys a test cares about. */
function setEnv(vars: Record<string, string | undefined>): void {
    // Strip anything that would leak in from the developer's real .env
    for (const key of Object.keys(process.env)) {
        if (
            key.startsWith('NEXT_PUBLIC_') ||
            key.startsWith('STRIPE_') ||
            key.startsWith('RESEND_') ||
            key.startsWith('SUPABASE_') ||
            key.startsWith('EMAIL_') ||
            ['GROQ_API_KEY', 'OPENAI_API_KEY', 'OLLAMA_BASE_URL', 'YOUTUBE_API_KEY',
                'RESUME_MATCH_THRESHOLD', 'LOG_LEVEL', 'NEXT_PHASE'].includes(key)
        ) {
            delete process.env[key];
        }
    }
    for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
}

async function loadEnvModule() {
    vi.resetModules();
    return import('@/lib/env');
}

beforeEach(() => {
    originalEnv = { ...process.env };
});

afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
});

describe('required configuration', () => {
    it('accepts a minimal valid configuration', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development' });
        const { getServerEnv } = await loadEnvModule();
        expect(getServerEnv().NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    });

    it('fails when the Supabase URL is missing', async () => {
        setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    });

    it('fails when the Supabase anon key is missing', async () => {
        setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    });

    it('rejects a malformed Supabase URL', async () => {
        setEnv({ ...VALID_BASE, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    });

    it('reports every problem at once, not just the first', async () => {
        setEnv({});
        const { getServerEnv } = await loadEnvModule();
        try {
            getServerEnv();
            expect.unreachable('should have thrown');
        } catch (error) {
            const message = (error as Error).message;
            expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL');
            expect(message).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        }
    });
});

describe('production guardrails', () => {
    it('refuses to boot in production with EMAIL_REDIRECT_TO set', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://app.example.com',
            EMAIL_REDIRECT_TO: 'dev@example.com',
        });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/EMAIL_REDIRECT_TO must not be set in production/);
    });

    it('allows EMAIL_REDIRECT_TO in development', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development', EMAIL_REDIRECT_TO: 'dev@example.com' });
        const { getServerEnv } = await loadEnvModule();
        expect(getServerEnv().EMAIL_REDIRECT_TO).toBe('dev@example.com');
    });

    it('requires an app URL in production', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'production' });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_APP_URL is required in production/);
    });

    it('accepts the legacy NEXT_PUBLIC_BASE_URL in production', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'production',
            NEXT_PUBLIC_BASE_URL: 'https://legacy.example.com',
        });
        const { getServerEnv, getAppUrl } = await loadEnvModule();
        expect(() => getServerEnv()).not.toThrow();
        expect(getAppUrl()).toBe('https://legacy.example.com');
    });

    it('rejects a half-configured Stripe pair in production', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://app.example.com',
            STRIPE_SECRET_KEY: 'sk_live_x',
        });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/must be set together/);
    });

    it('requires a sender address in production when email is enabled', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://app.example.com',
            RESEND_API_KEY: 're_live_x',
        });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/RESEND_FROM_EMAIL is required in production/);
    });

    it('relaxes production assertions during the build phase', async () => {
        // CI builds with placeholder config; cross-field production rules must
        // not fail the build.
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'production',
            NEXT_PHASE: 'phase-production-build',
        });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).not.toThrow();
    });
});

describe('email recipient resolution', () => {
    it('returns the intended recipient when no redirect is configured', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development' });
        const { resolveEmailRecipient } = await loadEnvModule();
        const result = resolveEmailRecipient('employee@company.com');
        expect(result).toEqual({
            to: 'employee@company.com',
            redirected: false,
            intended: 'employee@company.com',
        });
    });

    it('diverts mail in development when a redirect is configured', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development', EMAIL_REDIRECT_TO: 'dev@example.com' });
        const { resolveEmailRecipient } = await loadEnvModule();
        const result = resolveEmailRecipient('employee@company.com');
        expect(result.to).toBe('dev@example.com');
        expect(result.redirected).toBe(true);
        // The real recipient is preserved so it can be shown in the message body.
        expect(result.intended).toBe('employee@company.com');
    });
});

describe('feature detection', () => {
    it('reports billing as unconfigured when Stripe keys are absent', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development' });
        const { isBillingConfigured, isEmailConfigured } = await loadEnvModule();
        expect(isBillingConfigured()).toBe(false);
        expect(isEmailConfigured()).toBe(false);
    });

    it('reports billing as configured when both Stripe keys are present', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'development',
            STRIPE_SECRET_KEY: 'sk_test_x',
            STRIPE_WEBHOOK_SECRET: 'whsec_x',
        });
        const { isBillingConfigured } = await loadEnvModule();
        expect(isBillingConfigured()).toBe(true);
    });
});

describe('defaults and coercion', () => {
    it('defaults the resume match threshold', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development' });
        const { getServerEnv } = await loadEnvModule();
        expect(getServerEnv().RESUME_MATCH_THRESHOLD).toBe(0.3);
    });

    it('coerces the threshold from a string', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development', RESUME_MATCH_THRESHOLD: '0.75' });
        const { getServerEnv } = await loadEnvModule();
        expect(getServerEnv().RESUME_MATCH_THRESHOLD).toBe(0.75);
    });

    it('rejects an out-of-range threshold', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development', RESUME_MATCH_THRESHOLD: '5' });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/RESUME_MATCH_THRESHOLD/);
    });

    it('falls back to localhost for the app URL outside production', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development' });
        const { getAppUrl } = await loadEnvModule();
        expect(getAppUrl()).toBe('http://localhost:3000');
    });

    it('prefers NEXT_PUBLIC_APP_URL over the legacy alias', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'development',
            NEXT_PUBLIC_APP_URL: 'https://new.example.com',
            NEXT_PUBLIC_BASE_URL: 'https://legacy.example.com',
        });
        const { getAppUrl } = await loadEnvModule();
        expect(getAppUrl()).toBe('https://new.example.com');
    });
});

describe('empty-string handling', () => {
    // `.env` files conventionally declare optional keys with no value
    // (STRIPE_SECRET_KEY=), which arrives as ''. That must read as "not
    // configured", not as a validation failure — otherwise the shipped
    // .env.example itself would prevent the server from booting.
    it('treats empty optional values as unset rather than invalid', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'development',
            STRIPE_SECRET_KEY: '',
            STRIPE_WEBHOOK_SECRET: '',
            RESEND_API_KEY: '',
            RESEND_FROM_EMAIL: '',
            YOUTUBE_API_KEY: '',
            SUPABASE_SERVICE_ROLE_KEY: '',
        });
        const { getServerEnv, isBillingConfigured, isEmailConfigured } = await loadEnvModule();
        expect(() => getServerEnv()).not.toThrow();
        expect(getServerEnv().STRIPE_SECRET_KEY).toBeUndefined();
        expect(isBillingConfigured()).toBe(false);
        expect(isEmailConfigured()).toBe(false);
    });

    it('treats a whitespace-only value as unset', async () => {
        setEnv({ ...VALID_BASE, NODE_ENV: 'development', GROQ_API_KEY: '   ' });
        const { getServerEnv } = await loadEnvModule();
        expect(getServerEnv().GROQ_API_KEY).toBeUndefined();
    });

    it('still fails when a REQUIRED value is empty', async () => {
        setEnv({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    });

    it('does not treat an empty optional as a half-configured Stripe pair', async () => {
        setEnv({
            ...VALID_BASE,
            NODE_ENV: 'production',
            NEXT_PUBLIC_APP_URL: 'https://app.example.com',
            STRIPE_SECRET_KEY: '',
            STRIPE_WEBHOOK_SECRET: '',
        });
        const { getServerEnv } = await loadEnvModule();
        expect(() => getServerEnv()).not.toThrow();
    });
});
