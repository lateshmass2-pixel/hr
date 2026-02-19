// =============================================================================
// Security Utilities — Rate Limiting, Salary Encryption, Safe Responses
// =============================================================================

// =============================================================================
// 1. IN-MEMORY RATE LIMITER (per-instance; use Redis in production)
// =============================================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
    /** Maximum requests in the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
}

/** Default rate limit presets */
export const RATE_LIMITS = {
    /** Standard API calls: 60/min */
    standard: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,
    /** Auth-related: 10/min */
    auth: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
    /** Webhook endpoints: 100/min */
    webhook: { maxRequests: 100, windowSeconds: 60 } as RateLimitConfig,
    /** Heavy operations (payroll, export): 5/min */
    heavy: { maxRequests: 5, windowSeconds: 60 } as RateLimitConfig,
} as const;

/**
 * Check rate limit for a given key.
 * Returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.standard
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        // Create new window
        rateLimitStore.set(key, {
            count: 1,
            resetAt: now + config.windowSeconds * 1000,
        });
        return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowSeconds };
    }

    if (entry.count >= config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.ceil((entry.resetAt - now) / 1000),
        };
    }

    entry.count += 1;
    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore) {
            if (now > entry.resetAt) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

// =============================================================================
// 2. SALARY FIELD MASKING
// =============================================================================

/**
 * Mask a salary value for display to unauthorized users.
 * Shows last 3 digits only.
 * e.g., 750000 → "***000"
 */
export function maskSalary(salary: number): string {
    const str = salary.toString();
    if (str.length <= 3) return '***';
    return '***' + str.slice(-3);
}

/**
 * Redact sensitive fields from an employee record before sending to client
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(
    record: T,
    fieldsToRedact: string[] = ['salary', 'ssn', 'bank_account', 'tax_id']
): T {
    const redacted = { ...record };
    for (const field of fieldsToRedact) {
        if (field in redacted) {
            (redacted as any)[field] = '[REDACTED]';
        }
    }
    return redacted;
}

/**
 * Strip sensitive fields entirely from an object (for API responses)
 */
export function stripSensitiveFields<T extends Record<string, unknown>>(
    record: T,
    fieldsToStrip: string[] = ['salary', 'ssn', 'bank_account', 'tax_id']
): Partial<T> {
    const stripped = { ...record };
    for (const field of fieldsToStrip) {
        delete (stripped as any)[field];
    }
    return stripped;
}

// =============================================================================
// 3. SAFE ERROR RESPONSES
// =============================================================================

/**
 * Sanitize error messages before returning to client.
 * Never expose internal DB errors, stack traces, or sensitive info.
 */
export function safeError(error: unknown): { error: string; code: string } {
    if (error instanceof Error) {
        // Known application errors
        if (error.message.startsWith('Forbidden:')) {
            return { error: error.message, code: 'FORBIDDEN' };
        }
        if (error.message === 'Not authenticated') {
            return { error: 'Authentication required', code: 'UNAUTHORIZED' };
        }
        if (error.message === 'Not a member of this organization') {
            return { error: 'Access denied', code: 'FORBIDDEN' };
        }
    }

    // Generic fallback — never expose internal details
    console.error('[SafeError] Internal error:', error);
    return { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' };
}

// =============================================================================
// 4. ENVIRONMENT VARIABLE VALIDATION
// =============================================================================

/**
 * Validated environment variables. Call once at startup.
 * Throws immediately if required vars are missing.
 */
export function validateEnv(): void {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const optional = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'RESEND_API_KEY',
        'OPENAI_API_KEY',
        'NEXT_PUBLIC_APP_URL',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCheck your .env.local file.`
        );
    }

    // Warn about optional missing vars
    const missingOptional = optional.filter((key) => !process.env[key]);
    if (missingOptional.length > 0) {
        console.warn(
            `[Env] Optional environment variables not set:\n${missingOptional
                .map((k) => `  - ${k}`)
                .join('\n')}`
        );
    }
}

/**
 * Type-safe env access helper
 */
export function getEnv(key: string, fallback?: string): string {
    const value = process.env[key];
    if (!value && !fallback) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value ?? fallback!;
}

/**
 * Get the app's base URL
 */
export function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
