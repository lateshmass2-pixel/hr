// =============================================================================
// Centralized Session Resolver — Single Source of Truth
// =============================================================================
// NEVER accept organizationId from form data. Always use this.
// Tries organization_members first (new SaaS tables).
// Falls back to profiles.role (legacy) for backward compatibility.
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { OrgRole } from '@/lib/rbac/types';

export interface Session {
    userId: string;
    email: string;
    name: string;
    organizationId: string;
    organizationName: string;
    role: OrgRole;
}

/**
 * Get session or return null. Does not redirect.
 */
export async function getSession(): Promise<Session | null> {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // ------------------------------------------------------------------
    // Strategy 1: Try new organization_members table (SaaS multi-tenant)
    // ------------------------------------------------------------------
    const { data: membership } = await supabase
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
        .limit(1)
        .single();

    if (membership && (membership as any).organizations) {
        const org = (membership as any).organizations;
        return {
            userId: user.id,
            email: user.email ?? '',
            name: user.user_metadata?.full_name ?? user.email ?? 'User',
            organizationId: membership.organization_id,
            organizationName: org.name ?? '',
            role: membership.role as OrgRole,
        };
    }

    // ------------------------------------------------------------------
    // Strategy 2: Fallback to legacy profiles table
    // ------------------------------------------------------------------
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

    if (profile) {
        // Map legacy roles to new OrgRole
        const legacyRole = profile.role as string;
        const mappedRole: OrgRole =
            legacyRole === 'HR_ADMIN' ? 'owner' :
                legacyRole === 'CHAIRMAN' ? 'owner' :
                    legacyRole === 'MANAGER' ? 'manager' :
                        legacyRole === 'RECRUITER' ? 'recruiter' :
                            'employee';

        return {
            userId: user.id,
            email: user.email ?? '',
            name: profile.full_name ?? user.user_metadata?.full_name ?? 'User',
            organizationId: 'legacy', // No multi-tenant org yet
            organizationName: 'Default',
            role: mappedRole,
        };
    }

    return null;
}

/**
 * Get session or redirect to login. Use in server components and actions.
 */
export async function requireSession(): Promise<Session> {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }
    return session;
}

/**
 * Check session and permission in one call. Used in server actions.
 * Throws a controlled error if unauthorized (do NOT redirect in actions).
 */
export async function requirePermissionFromSession(
    permission: import('@/lib/rbac/types').Permission
): Promise<Session> {
    const { hasPermission } = await import('@/lib/rbac/types');
    const session = await getSession();

    if (!session) {
        throw new Error('Not authenticated');
    }

    if (!hasPermission(session.role, permission)) {
        throw new Error(`Forbidden: requires ${permission}`);
    }

    return session;
}
