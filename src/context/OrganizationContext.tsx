// =============================================================================
// Organization Context — Client-Side Multi-Tenant State
// =============================================================================
// Provides the current organization + user's role to all client components.
// Populated from server-side data passed via layout props.
// =============================================================================

'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { OrgRole } from '@/lib/rbac/types';
import type { Plan, SubscriptionStatus } from '@/lib/billing/plans';

// =============================================================================
// Types
// =============================================================================

export interface OrgContextUser {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
}

export interface OrgContextOrganization {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    plan: Plan;
    subscription_status: SubscriptionStatus;
    max_employees: number;
}

interface OrganizationContextType {
    /** Current authenticated user */
    user: OrgContextUser | null;
    /** Current organization */
    organization: OrgContextOrganization | null;
    /** User's role in the current org */
    role: OrgRole | null;
    /** Whether context is still loading */
    isLoading: boolean;
    /** Switch to a different org (for multi-org users) */
    switchOrganization: (orgId: string) => void;
}

// =============================================================================
// Context
// =============================================================================

const OrganizationContext = createContext<OrganizationContextType>({
    user: null,
    organization: null,
    role: null,
    isLoading: true,
    switchOrganization: () => { },
});

// =============================================================================
// Provider
// =============================================================================

interface OrganizationProviderProps {
    children: ReactNode;
    /** Initial data passed from server layout */
    initialUser?: OrgContextUser | null;
    initialOrganization?: OrgContextOrganization | null;
    initialRole?: OrgRole | null;
}

export function OrganizationProvider({
    children,
    initialUser = null,
    initialOrganization = null,
    initialRole = null,
}: OrganizationProviderProps) {
    const [user] = useState<OrgContextUser | null>(initialUser);
    const [organization, setOrganization] = useState<OrgContextOrganization | null>(initialOrganization);
    const [role, setRole] = useState<OrgRole | null>(initialRole);
    const [isLoading] = useState(false);

    const switchOrganization = async (orgId: string) => {
        // In production, this would:
        // 1. Set a cookie/preference for the selected org
        // 2. Refetch org data
        // 3. Update the context
        console.log(`[OrgContext] Switching to org: ${orgId}`);
        // For now, trigger a page reload to refetch from server
        window.location.href = `/dashboard?org=${orgId}`;
    };

    return (
        <OrganizationContext.Provider
            value={{ user, organization, role, isLoading, switchOrganization }}
        >
            {children}
        </OrganizationContext.Provider>
    );
}

// =============================================================================
// Hook
// =============================================================================

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (!context) {
        throw new Error('useOrganization must be used within OrganizationProvider');
    }
    return context;
}

/**
 * Convenience hook that throws if org is not loaded
 */
export function useRequiredOrganization() {
    const ctx = useOrganization();
    if (!ctx.organization || !ctx.user || !ctx.role) {
        throw new Error('Organization context not loaded');
    }
    return ctx as Required<OrganizationContextType>;
}
