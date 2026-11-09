// =============================================================================
// Centralized Session Resolver — Single Source of Truth
// =============================================================================
// The organization ALWAYS comes from the authenticated session, never from
// client input (form data, query string, request body).
//
// Previously this file had a fallback that returned a hardcoded
// `organizationId: 'legacy'` for any user without an `organization_members`
// row. That put every unmigrated user into one shared pseudo-tenant, and the
// sentinel leaked into business logic as `organizationId !== 'legacy'` checks
// that made tenant scoping conditional. Both are gone.
//
// A user now resolves to exactly one of three states, and callers must handle
// all three:
//
//   unauthenticated  -> no valid Supabase session
//   no_organization  -> authenticated, but not a member of any organization
//   authenticated    -> authenticated AND a member of an organization
//
// `no_organization` is a distinct state rather than an error because these
// users are legitimate — they have signed up but not yet created or joined an
// org. They belong in onboarding, not at the login page (which would loop).
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { OrgRole, Permission } from '@/lib/rbac/types';
import { logger } from '@/lib/observability/logger';

export interface Session {
    userId: string;
    email: string;
    name: string;
    /** Always a real organization UUID. Never a sentinel. */
    organizationId: string;
    organizationName: string;
    role: OrgRole;
}

export type SessionResult =
    | { status: 'authenticated'; session: Session }
    | { status: 'unauthenticated' }
    | { status: 'no_organization'; userId: string; email: string };

/** Where users without an organization are sent. */
export const ONBOARDING_PATH = '/dashboard/onboarding';

interface OrganizationRow {
    id: string;
    name: string;
    slug?: string;
}

/**
 * Shape of a membership row with the organization embedded.
 *
 * Supabase types an embedded relation as an array even when the foreign key
 * guarantees at most one row, so both forms are accepted and normalized by
 * `firstOrganization` below.
 */
interface MembershipRow {
    role: OrgRole;
    organization_id: string;
    organizations: OrganizationRow | OrganizationRow[] | null;
}

function firstOrganization(value: MembershipRow['organizations']): OrganizationRow | null {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Resolve the caller's full session state. This is the primitive; the helpers
 * below are conveniences over it.
 *
 * Note: memberships are ordered by `joined_at` so a user in several orgs gets
 * a stable, predictable default rather than whichever row Postgres returns
 * first. Real organization switching (an explicit, server-verified active-org
 * cookie) is plan task 2.6.
 */
export async function resolveSession(): Promise<SessionResult> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { status: 'unauthenticated' };
    }

    const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
            role,
            organization_id,
            organizations (
                id,
                name,
                slug
            )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1);

    if (membershipError) {
        // Fail closed. A lookup failure must not be treated as "no org" (which
        // would bounce the user to onboarding and potentially let them create a
        // duplicate organization), nor as authenticated with an unknown tenant.
        logger.error('Organization membership lookup failed', membershipError, {
            userId: user.id,
        });
        throw new Error('Could not resolve organization membership');
    }

    const membership = memberships?.[0] as unknown as MembershipRow | undefined;
    const organization = membership ? firstOrganization(membership.organizations) : null;

    if (!membership || !organization) {
        return {
            status: 'no_organization',
            userId: user.id,
            email: user.email ?? '',
        };
    }

    return {
        status: 'authenticated',
        session: {
            userId: user.id,
            email: user.email ?? '',
            name: user.user_metadata?.full_name ?? user.email ?? 'User',
            organizationId: membership.organization_id,
            organizationName: organization.name ?? '',
            role: membership.role,
        },
    };
}

/**
 * Get the session, or null if the caller is not a member of an organization.
 *
 * Returning null for `no_organization` is deliberate: it means no caller can
 * accidentally operate on a user with no tenant. Use `resolveSession()` when
 * you need to tell the two null cases apart.
 */
export async function getSession(): Promise<Session | null> {
    const result = await resolveSession();
    return result.status === 'authenticated' ? result.session : null;
}

/**
 * Require a full session. Redirects rather than returning.
 *
 * Use in server components and pages. Not in server actions that need to
 * return a structured error — use `requirePermissionFromSession` there.
 */
export async function requireSession(): Promise<Session> {
    const result = await resolveSession();

    if (result.status === 'unauthenticated') {
        redirect('/login');
    }

    if (result.status === 'no_organization') {
        // Authenticated but tenant-less: onboarding, never a shared tenant and
        // never back to /login (which would loop).
        redirect(ONBOARDING_PATH);
    }

    return result.session;
}

/**
 * Check session and permission in one call. For server actions.
 *
 * Throws controlled errors rather than redirecting, because redirecting from
 * inside an action produces a confusing client-side result. `safeError()` in
 * '@/lib/security' maps these messages to user-facing responses.
 */
export async function requirePermissionFromSession(
    permission: Permission
): Promise<Session> {
    const { hasPermission } = await import('@/lib/rbac/types');
    const result = await resolveSession();

    if (result.status === 'unauthenticated') {
        throw new Error('Not authenticated');
    }

    if (result.status === 'no_organization') {
        throw new Error('No organization');
    }

    if (!hasPermission(result.session.role, permission)) {
        throw new Error(`Forbidden: requires ${permission}`);
    }

    return result.session;
}
