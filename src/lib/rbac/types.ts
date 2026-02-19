// =============================================================================
// RBAC Types — Role-Based Access Control for Multi-Tenant SaaS
// =============================================================================

/**
 * Organization-level roles. These determine what a user can do within an org.
 * Hierarchical: owner > hr > manager/recruiter > employee
 */
export type OrgRole = 'owner' | 'hr' | 'recruiter' | 'manager' | 'employee';

/**
 * System-wide resource categories that can be controlled
 */
export type Resource =
    | 'organization'
    | 'members'
    | 'employees'
    | 'candidates'
    | 'projects'
    | 'tasks'
    | 'payroll'
    | 'leave'
    | 'performance'
    | 'announcements'
    | 'learning'
    | 'audit_logs'
    | 'settings'
    | 'billing'
    | 'invitations';

/**
 * CRUD + special actions
 */
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'approve' | 'export';

/**
 * A permission is a combination of resource and action
 */
export type Permission = `${Resource}:${Action}`;

/**
 * Type-safe permission matrix
 */
export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
    owner: [
        // Organization
        'organization:read', 'organization:update', 'organization:delete', 'organization:manage',
        // Members
        'members:create', 'members:read', 'members:update', 'members:delete', 'members:manage',
        // Employees
        'employees:create', 'employees:read', 'employees:update', 'employees:delete', 'employees:export',
        // Candidates
        'candidates:create', 'candidates:read', 'candidates:update', 'candidates:delete',
        // Projects
        'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:manage',
        // Tasks
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
        // Payroll
        'payroll:create', 'payroll:read', 'payroll:update', 'payroll:delete', 'payroll:approve', 'payroll:export',
        // Leave
        'leave:create', 'leave:read', 'leave:update', 'leave:approve',
        // Performance
        'performance:create', 'performance:read', 'performance:update', 'performance:delete',
        // Announcements
        'announcements:create', 'announcements:read', 'announcements:update', 'announcements:delete',
        // Learning
        'learning:create', 'learning:read', 'learning:update', 'learning:delete',
        // Audit
        'audit_logs:read', 'audit_logs:export',
        // Settings & Billing
        'settings:read', 'settings:update', 'settings:manage',
        'billing:read', 'billing:update', 'billing:manage',
        // Invitations
        'invitations:create', 'invitations:read', 'invitations:delete',
    ],

    hr: [
        'organization:read',
        'members:create', 'members:read', 'members:update',
        'employees:create', 'employees:read', 'employees:update', 'employees:delete', 'employees:export',
        'candidates:create', 'candidates:read', 'candidates:update', 'candidates:delete',
        'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:manage',
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
        'payroll:create', 'payroll:read', 'payroll:update', 'payroll:approve', 'payroll:export',
        'leave:create', 'leave:read', 'leave:update', 'leave:approve',
        'performance:create', 'performance:read', 'performance:update', 'performance:delete',
        'announcements:create', 'announcements:read', 'announcements:update', 'announcements:delete',
        'learning:create', 'learning:read', 'learning:update', 'learning:delete',
        'audit_logs:read',
        'settings:read', 'settings:update',
        'billing:read',
        'invitations:create', 'invitations:read', 'invitations:delete',
    ],

    recruiter: [
        'organization:read',
        'members:read',
        'employees:read',
        'candidates:create', 'candidates:read', 'candidates:update',
        'projects:read',
        'tasks:read',
        'leave:create', 'leave:read',
        'announcements:read',
        'learning:read',
        'invitations:read',
    ],

    manager: [
        'organization:read',
        'members:read',
        'employees:read',
        'candidates:read',
        'projects:create', 'projects:read', 'projects:update', 'projects:manage',
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
        'leave:create', 'leave:read', 'leave:approve',
        'performance:create', 'performance:read', 'performance:update',
        'announcements:read',
        'learning:read',
    ],

    employee: [
        'organization:read',
        'members:read',
        'employees:read',
        'projects:read',
        'tasks:create', 'tasks:read', 'tasks:update',
        'leave:create', 'leave:read',
        'performance:read',
        'announcements:read',
        'learning:read',
    ],
} as const;

/**
 * Role hierarchy — higher index = more powerful
 */
export const ROLE_HIERARCHY: OrgRole[] = ['employee', 'recruiter', 'manager', 'hr', 'owner'];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if roleA is >= roleB in hierarchy
 */
export function isRoleAtLeast(userRole: OrgRole, requiredRole: OrgRole): boolean {
    return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: OrgRole): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check multiple permissions (AND logic — all must pass)
 */
export function hasAllPermissions(role: OrgRole, permissions: Permission[]): boolean {
    return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check multiple permissions (OR logic — at least one must pass)
 */
export function hasAnyPermission(role: OrgRole, permissions: Permission[]): boolean {
    return permissions.some((p) => hasPermission(role, p));
}

/**
 * Human-readable role labels
 */
export const ROLE_LABELS: Record<OrgRole, string> = {
    owner: 'Owner',
    hr: 'HR Admin',
    recruiter: 'Recruiter',
    manager: 'Manager',
    employee: 'Employee',
};

/**
 * Route-level access configuration
 */
export const ROUTE_ACCESS: Record<string, { minRole?: OrgRole; permissions?: Permission[] }> = {
    '/dashboard': { minRole: 'employee' },
    '/dashboard/employees': { permissions: ['employees:read'] },
    '/dashboard/hiring': { permissions: ['candidates:read'] },
    '/dashboard/payroll': { permissions: ['payroll:read'] },
    '/dashboard/projects': { permissions: ['projects:read'] },
    '/dashboard/leave': { permissions: ['leave:read'] },
    '/dashboard/performance': { permissions: ['performance:read'] },
    '/dashboard/announcements': { permissions: ['announcements:read'] },
    '/dashboard/learning': { permissions: ['learning:read'] },
    '/dashboard/settings': { permissions: ['settings:read'] },
    '/dashboard/billing': { permissions: ['billing:read'] },
    '/dashboard/audit': { permissions: ['audit_logs:read'] },
    '/dashboard/team': { permissions: ['members:read'] },
};
