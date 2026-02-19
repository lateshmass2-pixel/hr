// =============================================================================
// Organization Management Utilities
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import type { OrgRole } from '@/lib/rbac/types';
import type { Plan, SubscriptionStatus } from '@/lib/billing/plans';

/**
 * Full organization record as returned from the database
 */
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    domain: string | null;
    plan: Plan;
    subscription_status: SubscriptionStatus;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    max_employees: number;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

/**
 * Organization member record
 */
export interface OrganizationMember {
    id: string;
    organization_id: string;
    user_id: string;
    role: OrgRole;
    is_active: boolean;
    joined_at: string;
}

/**
 * Get organization by slug (for route resolution)
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !data) return null;
    return data as Organization;
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return data as Organization;
}

/**
 * Get the current user's active organization.
 * If user belongs to multiple orgs, returns the first one
 * (in production, this would use a cookie/session preference).
 */
export async function getCurrentOrganization(): Promise<{
    organization: Organization;
    role: OrgRole;
} | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get the user's org membership (prefer stored preference, fallback to first)
    const { data: membership } = await supabase
        .from('organization_members')
        .select(`
      role,
      organization_id,
      organizations (*)
    `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

    if (!membership) return null;

    return {
        organization: (membership as any).organizations as Organization,
        role: membership.role as OrgRole,
    };
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

    return (data ?? []) as OrganizationMember[];
}

/**
 * Update an organization's plan after Stripe webhook
 */
export async function updateOrganizationPlan(
    organizationId: string,
    updates: {
        plan?: Plan;
        subscription_status?: SubscriptionStatus;
        stripe_customer_id?: string;
        stripe_subscription_id?: string;
        current_period_end?: string;
        max_employees?: number;
    }
): Promise<void> {
    const supabase = await createClient();
    await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId);
}
