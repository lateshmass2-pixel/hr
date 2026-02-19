// =============================================================================
// Server-side RBAC Guard — Use in Server Actions & Route Handlers
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import { type OrgRole, type Permission, hasPermission, isRoleAtLeast } from './types';

export interface AuthContext {
    userId: string;
    organizationId: string;
    role: OrgRole;
    email: string;
}

/**
 * Get the authenticated user's context for a specific organization.
 * Throws if not authenticated or not a member.
 */
export async function getAuthContext(organizationId: string): Promise<AuthContext> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('Not authenticated');
    }

    const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('role, is_active')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

    if (memberError || !membership || !membership.is_active) {
        throw new Error('Not a member of this organization');
    }

    return {
        userId: user.id,
        organizationId,
        role: membership.role as OrgRole,
        email: user.email ?? '',
    };
}

/**
 * Require specific permission. Throws if unauthorized.
 */
export async function requirePermission(
    organizationId: string,
    permission: Permission
): Promise<AuthContext> {
    const ctx = await getAuthContext(organizationId);

    if (!hasPermission(ctx.role, permission)) {
        throw new Error(`Forbidden: requires ${permission}`);
    }

    return ctx;
}

/**
 * Require minimum role level. Throws if unauthorized.
 */
export async function requireRole(
    organizationId: string,
    minRole: OrgRole
): Promise<AuthContext> {
    const ctx = await getAuthContext(organizationId);

    if (!isRoleAtLeast(ctx.role, minRole)) {
        throw new Error(`Forbidden: requires ${minRole} or higher`);
    }

    return ctx;
}

/**
 * Lightweight check without throwing — returns null if unauthorized.
 */
export async function checkAuth(organizationId: string): Promise<AuthContext | null> {
    try {
        return await getAuthContext(organizationId);
    } catch {
        return null;
    }
}

/**
 * Get current user's organization IDs + roles
 */
export async function getUserOrganizations(): Promise<
    Array<{ organizationId: string; name: string; role: OrgRole; slug: string }>
> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: memberships } = await supabase
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
        .eq('is_active', true);

    if (!memberships) return [];

    return memberships.map((m: any) => ({
        organizationId: m.organization_id,
        name: m.organizations?.name ?? '',
        role: m.role as OrgRole,
        slug: m.organizations?.slug ?? '',
    }));
}
