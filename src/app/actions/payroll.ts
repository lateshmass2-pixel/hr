// =============================================================================
// Server Actions — Payroll Processing (Multi-Tenant)
// =============================================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/rbac/guard';
import { createAuditLog } from '@/lib/audit';
import { CreatePayrollSchema } from '@/lib/validations/schemas';
import { hasFeature } from '@/lib/billing/plans';
import { getOrganizationById } from '@/lib/organization';
import { safeError } from '@/lib/security';

export async function createPayrollRecord(formData: FormData) {
    try {
        const raw = {
            organizationId: formData.get('organizationId') as string,
            employee_id: formData.get('employee_id') as string,
            pay_period_start: formData.get('pay_period_start') as string,
            pay_period_end: formData.get('pay_period_end') as string,
            base_salary: Number(formData.get('base_salary')),
            deductions: Number(formData.get('deductions') ?? 0),
            bonuses: Number(formData.get('bonuses') ?? 0),
            currency: (formData.get('currency') as string) || 'INR',
        };

        const validated = CreatePayrollSchema.parse(raw);
        const ctx = await requirePermission(validated.organizationId, 'payroll:create');

        // Feature gate
        const org = await getOrganizationById(validated.organizationId);
        if (!org || !hasFeature(org.plan, 'payroll')) {
            return { error: 'Upgrade your plan to access payroll features' };
        }

        // Calculate net pay
        const netPay = validated.base_salary + validated.bonuses - validated.deductions;

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('org_payroll_records')
            .insert({
                organization_id: validated.organizationId,
                employee_id: validated.employee_id,
                pay_period_start: validated.pay_period_start,
                pay_period_end: validated.pay_period_end,
                base_salary: validated.base_salary,
                deductions: validated.deductions,
                bonuses: validated.bonuses,
                net_pay: netPay,
                currency: validated.currency,
                status: 'draft',
                processed_by: ctx.userId,
            })
            .select()
            .single();

        if (error) throw error;

        await createAuditLog({
            organizationId: validated.organizationId,
            actorId: ctx.userId,
            action: 'payroll.create',
            entityType: 'payroll',
            entityId: data.id,
            changes: {
                after: {
                    employee_id: validated.employee_id,
                    net_pay: netPay,
                    period: `${validated.pay_period_start} to ${validated.pay_period_end}`,
                },
            },
        });

        return { success: true, payroll: data };
    } catch (error) {
        return safeError(error);
    }
}

export async function approvePayroll(organizationId: string, payrollId: string) {
    try {
        const ctx = await requirePermission(organizationId, 'payroll:approve');

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('org_payroll_records')
            .update({ status: 'approved' })
            .eq('id', payrollId)
            .eq('organization_id', organizationId)
            .eq('status', 'draft')
            .select()
            .single();

        if (error) throw error;
        if (!data) return { error: 'Payroll record not found or already processed' };

        await createAuditLog({
            organizationId,
            actorId: ctx.userId,
            action: 'payroll.approve',
            entityType: 'payroll',
            entityId: payrollId,
            changes: { before: { status: 'draft' }, after: { status: 'approved' } },
        });

        return { success: true, payroll: data };
    } catch (error) {
        return safeError(error);
    }
}

export async function processPayroll(organizationId: string, payrollId: string) {
    try {
        const ctx = await requirePermission(organizationId, 'payroll:approve');

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('org_payroll_records')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', payrollId)
            .eq('organization_id', organizationId)
            .eq('status', 'approved')
            .select()
            .single();

        if (error) throw error;
        if (!data) return { error: 'Payroll must be approved before processing' };

        await createAuditLog({
            organizationId,
            actorId: ctx.userId,
            action: 'payroll.process',
            entityType: 'payroll',
            entityId: payrollId,
            changes: { before: { status: 'approved' }, after: { status: 'paid' } },
        });

        return { success: true, payroll: data };
    } catch (error) {
        return safeError(error);
    }
}
