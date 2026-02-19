// =============================================================================
// Server Actions — Employee Management (Multi-Tenant)
// =============================================================================
// These replace direct Supabase calls from the client context.
// Every action: validates input → checks RBAC → performs operation → audits.
// =============================================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/rbac/guard';
import { createAuditLog, computeDiff } from '@/lib/audit';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '@/lib/validations/schemas';
import { hasFeature } from '@/lib/billing/plans';
import { getOrganizationById } from '@/lib/organization';
import { safeError } from '@/lib/security';

export async function createEmployee(formData: FormData) {
    try {
        // 1. Parse & validate input
        const raw = {
            organizationId: formData.get('organizationId') as string,
            full_name: formData.get('full_name') as string,
            email: formData.get('email') as string,
            position: formData.get('position') as string || undefined,
            department: formData.get('department') as string || undefined,
            phone: formData.get('phone') as string || undefined,
            date_of_joining: formData.get('date_of_joining') as string || undefined,
            salary: formData.get('salary') ? Number(formData.get('salary')) : undefined,
        };

        const validated = CreateEmployeeSchema.parse(raw);

        // 2. RBAC check
        const ctx = await requirePermission(validated.organizationId, 'employees:create');

        // 3. Feature gate check
        const org = await getOrganizationById(validated.organizationId);
        if (!org) throw new Error('Organization not found');

        if (!hasFeature(org.plan, 'basic_hr')) {
            return { error: 'Upgrade your plan to manage employees' };
        }

        // 4. Check employee limit
        const supabase = await createClient();
        const { count } = await supabase
            .from('org_employees')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', validated.organizationId);

        if ((count ?? 0) >= org.max_employees) {
            return { error: `Employee limit reached (${org.max_employees}). Upgrade your plan.` };
        }

        // 5. Insert employee
        const { data, error } = await supabase
            .from('org_employees')
            .insert({
                organization_id: validated.organizationId,
                full_name: validated.full_name,
                email: validated.email,
                position: validated.position,
                department: validated.department,
                phone: validated.phone,
                date_of_joining: validated.date_of_joining,
                salary: validated.salary,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { error: 'An employee with this email already exists' };
            }
            throw error;
        }

        // 6. Audit log
        await createAuditLog({
            organizationId: validated.organizationId,
            actorId: ctx.userId,
            action: 'employee.create',
            entityType: 'employee',
            entityId: data.id,
            changes: { after: { full_name: validated.full_name, email: validated.email } },
        });

        return { success: true, employee: data };
    } catch (error) {
        return safeError(error);
    }
}

export async function updateEmployee(formData: FormData) {
    try {
        const raw = {
            organizationId: formData.get('organizationId') as string,
            employeeId: formData.get('employeeId') as string,
            full_name: formData.get('full_name') as string || undefined,
            email: formData.get('email') as string || undefined,
            position: formData.get('position') as string || undefined,
            department: formData.get('department') as string || undefined,
            phone: formData.get('phone') as string || undefined,
            salary: formData.get('salary') ? Number(formData.get('salary')) : undefined,
        };

        const validated = UpdateEmployeeSchema.parse(raw);
        const ctx = await requirePermission(validated.organizationId, 'employees:update');

        const supabase = await createClient();

        // Get current state for audit diff
        const { data: current } = await supabase
            .from('org_employees')
            .select('*')
            .eq('id', validated.employeeId)
            .eq('organization_id', validated.organizationId)
            .single();

        if (!current) return { error: 'Employee not found' };

        // Build update object (only changed fields)
        const updates: Record<string, unknown> = {};
        if (validated.full_name) updates.full_name = validated.full_name;
        if (validated.email) updates.email = validated.email;
        if (validated.position !== undefined) updates.position = validated.position;
        if (validated.department !== undefined) updates.department = validated.department;
        if (validated.phone !== undefined) updates.phone = validated.phone;
        if (validated.salary !== undefined) updates.salary = validated.salary;

        const { data, error } = await supabase
            .from('org_employees')
            .update(updates)
            .eq('id', validated.employeeId)
            .eq('organization_id', validated.organizationId)
            .select()
            .single();

        if (error) throw error;

        // Audit with diff
        const diff = computeDiff(current, data);
        if (diff) {
            await createAuditLog({
                organizationId: validated.organizationId,
                actorId: ctx.userId,
                action: 'employee.update',
                entityType: 'employee',
                entityId: validated.employeeId,
                changes: diff,
            });
        }

        return { success: true, employee: data };
    } catch (error) {
        return safeError(error);
    }
}

export async function deleteEmployee(organizationId: string, employeeId: string) {
    try {
        const ctx = await requirePermission(organizationId, 'employees:delete');

        const supabase = await createClient();

        // Get employee for audit before deleting
        const { data: employee } = await supabase
            .from('org_employees')
            .select('full_name, email')
            .eq('id', employeeId)
            .eq('organization_id', organizationId)
            .single();

        const { error } = await supabase
            .from('org_employees')
            .delete()
            .eq('id', employeeId)
            .eq('organization_id', organizationId);

        if (error) throw error;

        await createAuditLog({
            organizationId,
            actorId: ctx.userId,
            action: 'employee.delete',
            entityType: 'employee',
            entityId: employeeId,
            changes: employee ? { before: employee } : undefined,
        });

        return { success: true };
    } catch (error) {
        return safeError(error);
    }
}
