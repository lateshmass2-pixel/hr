// =============================================================================
// Validated Environment Configuration — SERVER ONLY
// =============================================================================
// Do NOT import this from a client component. It reads server-only secrets;
// importing it client-side would attempt to bundle them.
//
// Two problems this solves:
//
//   1. Misconfiguration used to surface as a runtime 500 deep inside a request,
//      because every call site used `process.env.X!`. Now the process refuses
//      to boot with a message naming the missing variable.
//
//   2. Optional integrations (Stripe, Resend, LLM providers) were indistinguish-
//      able from required ones. They are now explicitly feature-gated, so a
//      deployment without Stripe disables billing instead of crashing checkout.
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

const nonEmpty = z.string().trim().min(1);

const serverEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // --- Required: the app cannot function without Supabase -------------------
    NEXT_PUBLIC_SUPABASE_URL: nonEmpty.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty,

    // --- Optional: privileged DB access (RLS bypass) --------------------------
    // Required only by admin paths (user provisioning, Stripe webhook).
    SUPABASE_SERVICE_ROLE_KEY: nonEmpty.optional(),

    // --- Optional: billing ---------------------------------------------------
    STRIPE_SECRET_KEY: nonEmpty.optional(),
    STRIPE_WEBHOOK_SECRET: nonEmpty.optional(),

    // --- Optional: transactional email ---------------------------------------
    RESEND_API_KEY: nonEmpty.optional(),
    RESEND_FROM_EMAIL: nonEmpty.optional(),

    /**
     * Development-only email redirect. When set, ALL outbound mail goes here
     * instead of the real recipient, so testing cannot spam real employees.
     *
     * Refused in production — see assertions below. This replaces the old
     * TEST_ADMIN_EMAIL, which had a hardcoded personal-address fallback that
     * silently redirected real credential emails in production.
     */
    EMAIL_REDIRECT_TO: z.string().trim().email().optional(),

    // --- Optional: AI providers ----------------------------------------------
    GROQ_API_KEY: nonEmpty.optional(),
    OPENAI_API_KEY: nonEmpty.optional(),
    OLLAMA_BASE_URL: nonEmpty.url().optional(),
    YOUTUBE_API_KEY: nonEmpty.optional(),

    // --- Optional: GitHub Integration (Work Intelligence) --------------------
    GITHUB_CLIENT_ID: nonEmpty.optional(),
    GITHUB_CLIENT_SECRET: nonEmpty.optional(),
    GITHUB_WEBHOOK_SECRET: nonEmpty.optional(),
    GITHUB_APP_ID: nonEmpty.optional(),
    GITHUB_APP_PRIVATE_KEY: nonEmpty.optional(),
    GITHUB_APP_INSTALLATION_ID: nonEmpty.optional(),

    // --- Tuning --------------------------------------------------------------
    /** Cosine-similarity floor for resume matching. */
    RESUME_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.3),

    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    /**
     * Public base URL used to build absolute links in emails and Stripe
     * redirects. NEXT_PUBLIC_BASE_URL is the legacy name for the same thing;
     * it is accepted as a fallback so existing deployments keep working.
     */
    NEXT_PUBLIC_APP_URL: nonEmpty.url().optional(),
    NEXT_PUBLIC_BASE_URL: nonEmpty.url().optional(),

    NEXT_PUBLIC_BLAZEFACE_MODEL_URL: nonEmpty.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

/**
 * During `next build` there is no real configuration — CI builds with
 * placeholders. Validation still runs (so schema errors are caught), but a
 * missing optional integration must not fail the build.
 */
function isBuildPhase(): boolean {
    return process.env.NEXT_PHASE === 'phase-production-build';
}

function formatIssues(error: z.ZodError): string {
    return error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
}

let cached: ServerEnv | null = null;

/**
 * Treat empty strings as absent.
 *
 * `.env` files conventionally declare optional keys with no value
 * (`STRIPE_SECRET_KEY=`), which arrives as `''`. Without this, an empty
 * placeholder would fail validation as "too small" instead of being read as
 * "this integration is not configured".
 */
function normalize(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
    const out: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(source)) {
        out[key] = typeof value === 'string' && value.trim() === '' ? undefined : value;
    }
    return out;
}

/**
 * Parse and validate the environment. Cached after the first successful call.
 * Throws with a list of every problem, not just the first.
 */
export function getServerEnv(): ServerEnv {
    if (cached) return cached;

    const parsed = serverEnvSchema.safeParse(normalize(process.env));

    if (!parsed.success) {
        throw new Error(
            `Invalid environment configuration:\n${formatIssues(parsed.error)}\n\n` +
            `See .env.example for the full list of supported variables.`
        );
    }

    const env = parsed.data;

    // -------------------------------------------------------------------------
    // Cross-field assertions that a per-field schema cannot express
    // -------------------------------------------------------------------------
    const problems: string[] = [];

    if (env.NODE_ENV === 'production' && !isBuildPhase()) {
        // A production deployment that redirects all mail to one inbox would
        // leak credentials and PII, and employees would never get their email.
        if (env.EMAIL_REDIRECT_TO) {
            problems.push(
                'EMAIL_REDIRECT_TO must not be set in production — it redirects all ' +
                'outbound mail away from real recipients. Unset it.'
            );
        }

        // Sending mail requires a verified sender; Resend's shared sandbox
        // address only delivers to the account owner.
        if (env.RESEND_API_KEY && !env.RESEND_FROM_EMAIL) {
            problems.push(
                'RESEND_FROM_EMAIL is required in production when RESEND_API_KEY is set.'
            );
        }

        // Stripe needs both halves: the key to call the API, the secret to
        // verify inbound webhooks. One without the other is a silent failure.
        if (Boolean(env.STRIPE_SECRET_KEY) !== Boolean(env.STRIPE_WEBHOOK_SECRET)) {
            problems.push(
                'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set together.'
            );
        }

        if (!env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_BASE_URL) {
            problems.push(
                'NEXT_PUBLIC_APP_URL is required in production (used for email links ' +
                'and Stripe redirect URLs). Defaulting to localhost would break both.'
            );
        }
    }

    if (problems.length > 0) {
        throw new Error(
            `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`
        );
    }

    cached = env;
    return env;
}

/**
 * Validate configuration at startup so misconfiguration is a boot failure
 * rather than a request failure. Called from instrumentation.ts.
 */
export function validateServerEnv(): void {
    const env = getServerEnv();

    // Report disabled features once, at boot, so operators know what is off
    // rather than discovering it when a user hits the feature.
    const disabled: string[] = [];
    if (!env.STRIPE_SECRET_KEY) disabled.push('billing (STRIPE_SECRET_KEY)');
    if (!env.RESEND_API_KEY) disabled.push('email (RESEND_API_KEY)');
    if (!env.SUPABASE_SERVICE_ROLE_KEY) disabled.push('admin operations (SUPABASE_SERVICE_ROLE_KEY)');
    if (!env.GROQ_API_KEY && !env.OPENAI_API_KEY) disabled.push('AI features (GROQ_API_KEY / OPENAI_API_KEY)');

    if (disabled.length > 0) {
        console.warn(
            JSON.stringify({
                level: 'warn',
                message: 'Optional features disabled by configuration',
                disabled,
                timestamp: new Date().toISOString(),
            })
        );
    }
}

// -----------------------------------------------------------------------------
// Derived accessors
// -----------------------------------------------------------------------------

/** Absolute base URL for links in emails and payment redirects. */
export function getAppUrl(): string {
    const env = getServerEnv();
    return env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
}

/** True when a feature's configuration is present. */
export function isBillingConfigured(): boolean {
    const env = getServerEnv();
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

export function isEmailConfigured(): boolean {
    return Boolean(getServerEnv().RESEND_API_KEY);
}

/**
 * Resolve the actual recipient for an outbound email.
 *
 * In development, EMAIL_REDIRECT_TO diverts everything to one inbox so testing
 * never mails real employees. In production the redirect is rejected at boot,
 * so this always returns the intended recipient.
 *
 * @param intended the real recipient address
 * @returns the address to send to, plus whether it was redirected
 */
export function resolveEmailRecipient(intended: string): {
    to: string;
    redirected: boolean;
    intended: string;
} {
    const env = getServerEnv();
    const override = env.EMAIL_REDIRECT_TO;

    if (override && env.NODE_ENV !== 'production') {
        return { to: override, redirected: true, intended };
    }
    return { to: intended, redirected: false, intended };
}

/** Verified sender address. Throws if email is enabled but no sender is set. */
export function getEmailSender(): string {
    const env = getServerEnv();
    if (env.RESEND_FROM_EMAIL) return env.RESEND_FROM_EMAIL;
    if (env.NODE_ENV === 'production') {
        throw new Error('RESEND_FROM_EMAIL is not configured');
    }
    // Resend's sandbox sender — only delivers to the account owner. Dev only.
    return 'onboarding@resend.dev';
}
