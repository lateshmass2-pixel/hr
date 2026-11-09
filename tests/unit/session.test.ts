import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The session resolver decides which tenant every request operates on. Its
 * previous fallback returned a hardcoded `organizationId: 'legacy'` for any
 * user without an `organization_members` row, placing unrelated users into one
 * shared pseudo-tenant. These tests pin the three-state contract that replaced
 * it, and specifically that no code path can produce a sentinel tenant.
 */

const mockGetUser = vi.fn();
const mockQuery = vi.fn();
const mockRedirect = vi.fn((path: string) => {
    // next/navigation's redirect throws to halt rendering; emulate that so
    // control flow in the code under test behaves the same way.
    throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getUser: mockGetUser },
        from: () => {
            // Mirror the builder chain used by resolveSession:
            //   .select(...).eq(...).eq(...).order(...).limit(...)
            const builder: Record<string, unknown> = {};
            for (const method of ['select', 'eq', 'order']) {
                builder[method] = () => builder;
            }
            builder.limit = () => mockQuery();
            return builder;
        },
    }),
}));

vi.mock('next/navigation', () => ({
    redirect: (path: string) => mockRedirect(path),
}));

const USER = { id: 'user-1', email: 'a@example.com', user_metadata: { full_name: 'Ada' } };

async function loadSession() {
    vi.resetModules();
    return import('@/lib/auth/session');
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('resolveSession', () => {
    it('returns unauthenticated when there is no user', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        const { resolveSession } = await loadSession();
        expect(await resolveSession()).toEqual({ status: 'unauthenticated' });
    });

    it('returns unauthenticated when auth errors', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('bad jwt') });
        const { resolveSession } = await loadSession();
        expect(await resolveSession()).toEqual({ status: 'unauthenticated' });
    });

    it('returns no_organization when the user has no membership', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({ data: [], error: null });

        const { resolveSession } = await loadSession();
        const result = await resolveSession();

        expect(result).toEqual({
            status: 'no_organization',
            userId: 'user-1',
            email: 'a@example.com',
        });
        // The critical assertion: no sentinel organization is invented.
        expect(JSON.stringify(result)).not.toContain('legacy');
    });

    it('returns no_organization when the membership has no organization joined', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{ role: 'owner', organization_id: 'org-1', organizations: null }],
            error: null,
        });

        const { resolveSession } = await loadSession();
        expect((await resolveSession()).status).toBe('no_organization');
    });

    it('returns an authenticated session with a real organization', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{
                role: 'hr',
                organization_id: 'org-abc',
                organizations: { id: 'org-abc', name: 'Acme', slug: 'acme' },
            }],
            error: null,
        });

        const { resolveSession } = await loadSession();
        const result = await resolveSession();

        expect(result.status).toBe('authenticated');
        if (result.status !== 'authenticated') return;
        expect(result.session).toEqual({
            userId: 'user-1',
            email: 'a@example.com',
            name: 'Ada',
            organizationId: 'org-abc',
            organizationName: 'Acme',
            role: 'hr',
        });
    });

    it('accepts the embedded organization as an array (Supabase relation shape)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{
                role: 'owner',
                organization_id: 'org-xyz',
                organizations: [{ id: 'org-xyz', name: 'Globex' }],
            }],
            error: null,
        });

        const { resolveSession } = await loadSession();
        const result = await resolveSession();

        expect(result.status).toBe('authenticated');
        if (result.status !== 'authenticated') return;
        expect(result.session.organizationId).toBe('org-xyz');
        expect(result.session.organizationName).toBe('Globex');
    });

    it('FAILS CLOSED when the membership lookup errors', async () => {
        // A lookup failure must not degrade to "no organization" (which would
        // send the user to onboarding and let them create a duplicate org) nor
        // to an authenticated session with an unknown tenant.
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({ data: null, error: { message: 'connection reset' } });

        const { resolveSession } = await loadSession();
        await expect(resolveSession()).rejects.toThrow(/Could not resolve organization membership/);
    });

    it('falls back to the email as display name when metadata is absent', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'u2', email: 'b@example.com', user_metadata: {} } },
            error: null,
        });
        mockQuery.mockResolvedValue({
            data: [{ role: 'employee', organization_id: 'o', organizations: { id: 'o', name: 'N' } }],
            error: null,
        });

        const { resolveSession } = await loadSession();
        const result = await resolveSession();
        if (result.status !== 'authenticated') throw new Error('expected authenticated');
        expect(result.session.name).toBe('b@example.com');
    });
});

describe('getSession', () => {
    it('returns null when unauthenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        const { getSession } = await loadSession();
        expect(await getSession()).toBeNull();
    });

    it('returns null when the user has no organization', async () => {
        // Deliberate: callers of getSession() can never receive a tenant-less
        // user, so they cannot accidentally query without a real org id.
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({ data: [], error: null });
        const { getSession } = await loadSession();
        expect(await getSession()).toBeNull();
    });

    it('returns the session when fully authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{ role: 'owner', organization_id: 'org-1', organizations: { id: 'org-1', name: 'Acme' } }],
            error: null,
        });
        const { getSession } = await loadSession();
        expect((await getSession())?.organizationId).toBe('org-1');
    });
});

describe('requireSession', () => {
    it('redirects to /login when unauthenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        const { requireSession } = await loadSession();
        await expect(requireSession()).rejects.toThrow('NEXT_REDIRECT:/login');
        expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('redirects to onboarding — NOT /login — when the user has no org', async () => {
        // Sending a tenant-less but authenticated user to /login would loop:
        // they are already signed in, so login bounces them straight back.
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({ data: [], error: null });

        const { requireSession, ONBOARDING_PATH } = await loadSession();
        await expect(requireSession()).rejects.toThrow(`NEXT_REDIRECT:${ONBOARDING_PATH}`);
        expect(mockRedirect).toHaveBeenCalledWith(ONBOARDING_PATH);
        expect(mockRedirect).not.toHaveBeenCalledWith('/login');
    });

    it('returns the session when fully authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{ role: 'manager', organization_id: 'org-9', organizations: { id: 'org-9', name: 'Z' } }],
            error: null,
        });
        const { requireSession } = await loadSession();
        const session = await requireSession();
        expect(session.organizationId).toBe('org-9');
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});

describe('requirePermissionFromSession', () => {
    it('throws Not authenticated rather than redirecting', async () => {
        // Redirecting from inside a server action produces a confusing client
        // result, so this path throws and safeError() maps it to a response.
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
        const { requirePermissionFromSession } = await loadSession();
        await expect(requirePermissionFromSession('projects:read')).rejects.toThrow('Not authenticated');
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('throws No organization for a tenant-less user', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({ data: [], error: null });
        const { requirePermissionFromSession } = await loadSession();
        await expect(requirePermissionFromSession('projects:read')).rejects.toThrow('No organization');
    });

    it('throws Forbidden when the role lacks the permission', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{ role: 'employee', organization_id: 'org-1', organizations: { id: 'org-1', name: 'A' } }],
            error: null,
        });
        const { requirePermissionFromSession } = await loadSession();
        await expect(requirePermissionFromSession('payroll:read')).rejects.toThrow(/Forbidden: requires payroll:read/);
    });

    it('returns the session when the permission is held', async () => {
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockQuery.mockResolvedValue({
            data: [{ role: 'owner', organization_id: 'org-1', organizations: { id: 'org-1', name: 'A' } }],
            error: null,
        });
        const { requirePermissionFromSession } = await loadSession();
        const session = await requirePermissionFromSession('payroll:read');
        expect(session.role).toBe('owner');
    });
});
