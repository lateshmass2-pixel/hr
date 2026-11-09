import { describe, it, expect } from 'vitest';
import {
    ROLE_PERMISSIONS,
    ROLE_HIERARCHY,
    hasPermission,
    isRoleAtLeast,
    hasAllPermissions,
    hasAnyPermission,
    type OrgRole,
} from '@/lib/rbac/types';

/**
 * The permission matrix is security-critical and edited by hand, which makes it
 * exactly the kind of thing that drifts silently. These tests pin the
 * invariants rather than restating the whole table.
 */
describe('RBAC permission matrix', () => {
    const roles = Object.keys(ROLE_PERMISSIONS) as OrgRole[];

    it('defines permissions for every role in the hierarchy', () => {
        for (const role of ROLE_HIERARCHY) {
            expect(ROLE_PERMISSIONS[role], `missing permissions for ${role}`).toBeDefined();
            expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
        }
        // And no role exists outside the hierarchy — otherwise isRoleAtLeast
        // silently returns -1 comparisons for it.
        for (const role of roles) {
            expect(ROLE_HIERARCHY, `${role} missing from ROLE_HIERARCHY`).toContain(role);
        }
    });

    it('contains no duplicate permissions within a role', () => {
        for (const role of roles) {
            const perms = ROLE_PERMISSIONS[role];
            expect(new Set(perms).size, `${role} has duplicate permissions`).toBe(perms.length);
        }
    });

    describe('privilege boundaries', () => {
        it('grants owner strictly the most permissions', () => {
            const ownerCount = ROLE_PERMISSIONS.owner.length;
            for (const role of roles.filter((r) => r !== 'owner')) {
                expect(
                    ROLE_PERMISSIONS[role].length,
                    `${role} should not have as many permissions as owner`
                ).toBeLessThan(ownerCount);
            }
        });

        it('restricts billing management to owner', () => {
            expect(hasPermission('owner', 'billing:manage')).toBe(true);
            for (const role of roles.filter((r) => r !== 'owner')) {
                expect(hasPermission(role, 'billing:manage'), `${role} must not manage billing`).toBe(false);
            }
        });

        it('restricts organization deletion to owner', () => {
            expect(hasPermission('owner', 'organization:delete')).toBe(true);
            for (const role of roles.filter((r) => r !== 'owner')) {
                expect(hasPermission(role, 'organization:delete'), `${role} must not delete the org`).toBe(false);
            }
        });

        it('does not let an employee read payroll or export employee data', () => {
            expect(hasPermission('employee', 'payroll:read')).toBe(false);
            expect(hasPermission('employee', 'employees:export')).toBe(false);
        });

        it('does not let a recruiter approve leave or touch payroll', () => {
            expect(hasPermission('recruiter', 'leave:approve')).toBe(false);
            expect(hasPermission('recruiter', 'payroll:read')).toBe(false);
        });

        it('does not let a manager delete the org or manage members', () => {
            expect(hasPermission('manager', 'organization:delete')).toBe(false);
            expect(hasPermission('manager', 'members:manage')).toBe(false);
        });
    });

    describe('hasPermission', () => {
        it('returns false for an unknown role instead of throwing', () => {
            expect(hasPermission('nonsense' as OrgRole, 'employees:read')).toBe(false);
        });

        it('returns false for a permission the role does not hold', () => {
            expect(hasPermission('employee', 'payroll:approve')).toBe(false);
        });
    });

    describe('isRoleAtLeast', () => {
        it('treats a role as at least itself', () => {
            for (const role of ROLE_HIERARCHY) {
                expect(isRoleAtLeast(role, role)).toBe(true);
            }
        });

        it('orders the hierarchy transitively', () => {
            expect(isRoleAtLeast('owner', 'employee')).toBe(true);
            expect(isRoleAtLeast('hr', 'manager')).toBe(true);
            expect(isRoleAtLeast('manager', 'employee')).toBe(true);
        });

        it('does not let a lower role satisfy a higher requirement', () => {
            expect(isRoleAtLeast('employee', 'owner')).toBe(false);
            expect(isRoleAtLeast('manager', 'hr')).toBe(false);
            expect(isRoleAtLeast('recruiter', 'owner')).toBe(false);
        });
    });

    describe('combinators', () => {
        it('hasAllPermissions requires every permission', () => {
            expect(hasAllPermissions('owner', ['employees:read', 'payroll:read'])).toBe(true);
            expect(hasAllPermissions('employee', ['employees:read', 'payroll:read'])).toBe(false);
        });

        it('hasAnyPermission requires only one', () => {
            expect(hasAnyPermission('employee', ['payroll:read', 'tasks:read'])).toBe(true);
            expect(hasAnyPermission('employee', ['payroll:read', 'payroll:approve'])).toBe(false);
        });

        it('returns true for hasAllPermissions on an empty list (vacuous truth)', () => {
            // Documented so nobody relies on an empty list acting as a deny-all.
            expect(hasAllPermissions('employee', [])).toBe(true);
        });
    });
});
