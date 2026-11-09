// =============================================================================
// Structured Logger
// =============================================================================
// Emits single-line JSON so log aggregators (CloudWatch, Datadog, Vercel,
// Better Stack) can index fields instead of regex-scraping message strings.
//
// Rules:
//   1. Never log PII or free-text user content (resume text, prompts, emails).
//      Log identifiers, not payloads.
//   2. Always attach tenant context when you have it — every production
//      question starts with "which org?".
//   3. Errors are serialized safely; stack traces stay server-side only.
//
// This replaces the ~213 ad hoc console.* calls. Migrate incrementally:
// new code must use this, old console calls get swapped as files are touched.
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

/** Minimum level to emit. Set LOG_LEVEL=debug locally for verbose output. */
function minLevel(): number {
    const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';
    return LEVEL_ORDER[configured] ?? LEVEL_ORDER.info;
}

/**
 * Context attached to every log line. Keep this to identifiers and
 * low-cardinality labels — no user content.
 */
export interface LogContext {
    /** Correlates all lines emitted while handling one request. */
    requestId?: string;
    /** Tenant. The first thing you filter on during an incident. */
    organizationId?: string;
    userId?: string;
    /** Route or server action name, e.g. 'POST /api/agent/scout'. */
    route?: string;
    /** Milliseconds. Set on completion lines. */
    durationMs?: number;
    /** Anything else — must be JSON-serializable and free of PII. */
    [key: string]: unknown;
}

/**
 * Field names that must never reach the log sink, even if a caller passes
 * them by accident. Checked case-insensitively against context keys.
 */
const REDACTED_KEYS = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'authorization',
    'cookie',
    'salary',
    'ssn',
    'bank_account',
    'tax_id',
    'resumetext',
    'resume_text',
    'prompt',
    'email',
];

function scrub(context: LogContext): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
        if (value === undefined) continue;
        if (REDACTED_KEYS.includes(key.toLowerCase())) {
            out[key] = '[REDACTED]';
            continue;
        }
        out[key] = value;
    }
    return out;
}

/** Serialize an error without leaking a stack trace into a shared sink. */
function serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            errorName: error.name,
            errorMessage: error.message,
            // Stacks are useful but noisy and can embed values. Keep them out of
            // production logs; error tracking (Sentry) is the right home for them.
            ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
        };
    }
    return { errorMessage: String(error) };
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
    if (LEVEL_ORDER[level] < minLevel()) return;

    const line = JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...scrub(context),
    });

    // Route through the matching console method so platform log collectors
    // classify severity correctly.
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

export const logger = {
    debug: (message: string, context?: LogContext) => emit('debug', message, context),
    info: (message: string, context?: LogContext) => emit('info', message, context),
    warn: (message: string, context?: LogContext) => emit('warn', message, context),

    /**
     * Log an error with a safely serialized cause.
     * @example logger.error('Checkout failed', err, { organizationId, route })
     */
    error: (message: string, error?: unknown, context?: LogContext) =>
        emit('error', message, { ...context, ...(error ? serializeError(error) : {}) }),

    /**
     * Create a logger with pre-bound context so per-request fields
     * don't have to be threaded through every call site.
     */
    child(base: LogContext) {
        return {
            debug: (message: string, context?: LogContext) => emit('debug', message, { ...base, ...context }),
            info: (message: string, context?: LogContext) => emit('info', message, { ...base, ...context }),
            warn: (message: string, context?: LogContext) => emit('warn', message, { ...base, ...context }),
            error: (message: string, error?: unknown, context?: LogContext) =>
                emit('error', message, { ...base, ...context, ...(error ? serializeError(error) : {}) }),
        };
    },
};

/** Generate a request correlation id. */
export function newRequestId(): string {
    return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export type ChildLogger = ReturnType<typeof logger.child>;
