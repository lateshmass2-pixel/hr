// =============================================================================
// RoleGate — Client Component for Role-Based UI Rendering
// =============================================================================
// Usage:
//   <RoleGate minRole="hr">
//     <DeleteEmployeeButton />
//   </RoleGate>
//
//   <RoleGate permission="payroll:approve">
//     <ApprovePayrollButton />
//   </RoleGate>
// =============================================================================

'use client';

import { type OrgRole, type Permission, hasPermission, isRoleAtLeast } from '@/lib/rbac/types';
import { useOrganization } from '@/context/OrganizationContext';

interface RoleGateProps {
    children: React.ReactNode;
    /** Show children only if user's role is >= this */
    minRole?: OrgRole;
    /** Show children only if user's role has this specific permission */
    permission?: Permission;
    /** Optional fallback when access is denied */
    fallback?: React.ReactNode;
}

export default function RoleGate({ children, minRole, permission, fallback }: RoleGateProps) {
    const { role } = useOrganization();

    if (!role) return fallback ?? null;

    if (minRole && !isRoleAtLeast(role, minRole)) {
        return <>{fallback ?? null}</>;
    }

    if (permission && !hasPermission(role, permission)) {
        return <>{fallback ?? null}</>;
    }

    return <>{children}</>;
}
