import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { logger, newRequestId } from '@/lib/observability/logger';

/**
 * The logger's redaction behaviour is a privacy control, not a nicety: this
 * app handles salaries, resumes and candidate PII. If redaction regresses,
 * that data silently starts flowing into a third-party log sink.
 */
describe('structured logger', () => {
    let logSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function lastPayload(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
        const call = spy.mock.calls.at(-1);
        expect(call, 'expected a log line to be emitted').toBeDefined();
        return JSON.parse(call![0] as string);
    }

    it('emits single-line parseable JSON', () => {
        logger.info('hello');
        const raw = logSpy.mock.calls.at(-1)![0] as string;
        expect(raw).not.toContain('\n');
        expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('includes level, message and an ISO timestamp', () => {
        logger.info('something happened');
        const payload = lastPayload(logSpy);
        expect(payload.level).toBe('info');
        expect(payload.message).toBe('something happened');
        expect(typeof payload.timestamp).toBe('string');
        expect(new Date(payload.timestamp as string).toString()).not.toBe('Invalid Date');
    });

    it('passes through tenant context fields', () => {
        logger.info('scoped', {
            organizationId: 'org-1',
            userId: 'user-1',
            requestId: 'req-1',
            route: 'POST /api/x',
            durationMs: 12,
        });
        const payload = lastPayload(logSpy);
        expect(payload.organizationId).toBe('org-1');
        expect(payload.userId).toBe('user-1');
        expect(payload.requestId).toBe('req-1');
        expect(payload.route).toBe('POST /api/x');
        expect(payload.durationMs).toBe(12);
    });

    it.each([
        'password',
        'token',
        'secret',
        'apiKey',
        'api_key',
        'authorization',
        'cookie',
        'salary',
        'ssn',
        'bank_account',
        'tax_id',
        'resumeText',
        'resume_text',
        'prompt',
        'email',
    ])('redacts the %s field', (field) => {
        logger.info('sensitive', { [field]: 'should-not-appear' });
        const raw = logSpy.mock.calls.at(-1)![0] as string;
        expect(raw).not.toContain('should-not-appear');
        expect(JSON.parse(raw)[field]).toBe('[REDACTED]');
    });

    it('redacts case-insensitively', () => {
        logger.info('sensitive', { SALARY: 'should-not-appear', ApiKey: 'nope' });
        const raw = logSpy.mock.calls.at(-1)![0] as string;
        expect(raw).not.toContain('should-not-appear');
        expect(raw).not.toContain('nope');
    });

    it('omits undefined context values rather than emitting null', () => {
        logger.info('partial', { organizationId: undefined, userId: 'u1' });
        const payload = lastPayload(logSpy);
        expect('organizationId' in payload).toBe(false);
        expect(payload.userId).toBe('u1');
    });

    it('routes warn and error to the matching console method', () => {
        logger.warn('careful');
        expect(lastPayload(warnSpy).level).toBe('warn');

        logger.error('broken');
        expect(lastPayload(errorSpy).level).toBe('error');
    });

    it('serializes an Error cause without losing the message', () => {
        logger.error('failed', new Error('underlying cause'), { route: 'POST /x' });
        const payload = lastPayload(errorSpy);
        expect(payload.errorName).toBe('Error');
        expect(payload.errorMessage).toBe('underlying cause');
        expect(payload.route).toBe('POST /x');
    });

    it('handles a non-Error thrown value', () => {
        logger.error('failed', 'just a string');
        expect(lastPayload(errorSpy).errorMessage).toBe('just a string');
    });

    it('does not throw when called with no context', () => {
        expect(() => logger.error('no context')).not.toThrow();
    });

    describe('child loggers', () => {
        it('merges bound context into every line', () => {
            const log = logger.child({ requestId: 'req-9', organizationId: 'org-9' });
            log.info('first');
            expect(lastPayload(logSpy)).toMatchObject({ requestId: 'req-9', organizationId: 'org-9' });

            log.warn('second');
            expect(lastPayload(warnSpy)).toMatchObject({ requestId: 'req-9', organizationId: 'org-9' });
        });

        it('lets per-call context override bound context', () => {
            const log = logger.child({ route: 'bound' });
            log.info('override', { route: 'per-call' });
            expect(lastPayload(logSpy).route).toBe('per-call');
        });

        it('still redacts sensitive fields supplied at bind time', () => {
            const log = logger.child({ salary: 'should-not-appear' });
            log.info('bound sensitive');
            expect(logSpy.mock.calls.at(-1)![0] as string).not.toContain('should-not-appear');
        });
    });

    describe('newRequestId', () => {
        it('returns a non-empty unique string', () => {
            const ids = new Set(Array.from({ length: 200 }, () => newRequestId()));
            expect(ids.size).toBe(200);
            for (const id of ids) expect(id.length).toBeGreaterThan(0);
        });
    });
});
