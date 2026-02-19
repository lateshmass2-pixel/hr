// =============================================================================
// Zod Validation Schemas — Shared across Server Actions & API Routes
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Organization Schemas
// =============================================================================

export const CreateOrganizationSchema = z.object({
    name: z
        .string()
        .min(2, 'Organization name must be at least 2 characters')
        .max(100, 'Organization name must be under 100 characters')
        .trim(),
    slug: z
        .string()
        .min(3, 'Slug must be at least 3 characters')
        .max(50, 'Slug must be under 50 characters')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
        .trim(),
});

export const UpdateOrganizationSchema = z.object({
    organizationId: z.string().uuid('Invalid organization ID'),
    name: z.string().min(2).max(100).trim().optional(),
    logo_url: z.string().url().nullable().optional(),
    domain: z.string().max(255).nullable().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// Employee Schemas
// =============================================================================

export const CreateEmployeeSchema = z.object({
    organizationId: z.string().uuid(),
    full_name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100)
        .trim(),
    email: z
        .string()
        .email('Invalid email address')
        .max(255)
        .toLowerCase()
        .trim(),
    position: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    phone: z
        .string()
        .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number')
        .optional()
        .or(z.literal('')),
    date_of_joining: z.string().optional(),
    salary: z
        .number()
        .min(0, 'Salary cannot be negative')
        .max(99999999, 'Salary value too large')
        .optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
    organizationId: z.string().uuid(),
    employeeId: z.string().uuid(),
});

// =============================================================================
// Invite Schemas
// =============================================================================

export const CreateInviteSchema = z.object({
    organizationId: z.string().uuid(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    role: z.enum(['hr', 'recruiter', 'manager', 'employee'], {
        message: 'Invalid role. Cannot invite as owner.',
    }),
});

export const AcceptInviteSchema = z.object({
    token: z
        .string()
        .min(32, 'Invalid invitation token')
        .max(128)
        .trim(),
});

// =============================================================================
// Leave Request Schemas
// =============================================================================

export const CreateLeaveRequestSchema = z
    .object({
        organizationId: z.string().uuid(),
        leave_type: z.enum(['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid']),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
        reason: z.string().max(500).optional(),
    })
    .refine((data) => data.end_date >= data.start_date, {
        message: 'End date must be on or after start date',
        path: ['end_date'],
    });

// =============================================================================
// Project Schemas
// =============================================================================

export const CreateProjectSchema = z.object({
    organizationId: z.string().uuid(),
    title: z.string().min(2).max(200).trim(),
    description: z.string().max(2000).optional(),
    status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
    due_date: z.string().optional(),
    team_lead_id: z.string().uuid().optional(),
    member_ids: z.array(z.string().uuid()).default([]),
});

// =============================================================================
// Task Schemas
// =============================================================================

export const CreateTaskSchema = z.object({
    organizationId: z.string().uuid(),
    project_id: z.string().uuid(),
    title: z.string().min(2).max(300).trim(),
    description: z.string().max(2000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    assignee_id: z.string().uuid().optional(),
    due_date: z.string().optional(),
});

export const UpdateTaskStatusSchema = z.object({
    organizationId: z.string().uuid(),
    taskId: z.string().uuid(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
    proof_url: z.string().url().optional(),
});

// =============================================================================
// Payroll Schemas
// =============================================================================

export const CreatePayrollSchema = z
    .object({
        organizationId: z.string().uuid(),
        employee_id: z.string().uuid(),
        pay_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        pay_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        base_salary: z.number().min(0).max(99999999),
        deductions: z.number().min(0).default(0),
        bonuses: z.number().min(0).default(0),
        currency: z.string().length(3).default('INR'),
    })
    .refine((data) => data.pay_period_end > data.pay_period_start, {
        message: 'Pay period end must be after start',
        path: ['pay_period_end'],
    });

// =============================================================================
// Announcement Schemas
// =============================================================================

export const CreateAnnouncementSchema = z.object({
    organizationId: z.string().uuid(),
    title: z.string().min(2).max(200).trim(),
    content: z.string().min(10).max(5000).trim(),
    priority: z.enum(['high', 'normal', 'low']).default('normal'),
    expires_at: z.string().optional(),
});

// =============================================================================
// Performance Review Schemas
// =============================================================================

export const CreatePerformanceReviewSchema = z.object({
    organizationId: z.string().uuid(),
    employee_id: z.string().uuid(),
    review_period: z.string().min(2).max(50),
    rating: z.number().min(1).max(5),
    strengths: z.string().max(2000).optional(),
    improvements: z.string().max(2000).optional(),
    ai_summary: z.string().max(5000).optional(),
    goals: z.array(z.object({
        title: z.string(),
        description: z.string().optional(),
        target_date: z.string().optional(),
    })).default([]),
});

// =============================================================================
// Type exports inferred from schemas
// =============================================================================

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
export type CreatePayrollInput = z.infer<typeof CreatePayrollSchema>;
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type CreatePerformanceReviewInput = z.infer<typeof CreatePerformanceReviewSchema>;
