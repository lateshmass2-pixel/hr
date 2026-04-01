/**
 * Input validation utilities using Zod
 * Provides consistent validation across the application
 */

import { z } from 'zod';
import { ValidationError } from './index';

// Common validation schemas
export const EmailSchema = z.string().email('Invalid email address');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[!@#$%^&*]/, 'Password must contain a special character');

export const DateSchema = z.string().datetime().or(z.date());

export const StringInputSchema = z.string().min(1).max(500);

export const EmployeeSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  email: EmailSchema,
  position: z.string().min(1, 'Position is required').max(255),
  department: z.string().min(1, 'Department is required').max(255),
});

export const LeaveRequestSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(1000),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
);

export const PayrollSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  salary: z.number().positive('Salary must be positive'),
  bonus: z.number().nonnegative('Bonus cannot be negative').optional(),
  deductions: z.number().nonnegative('Deductions cannot be negative').optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
});

export const ApplicationSchema = z.object({
  candidate_name: z.string().min(1, 'Candidate name is required'),
  candidate_email: EmailSchema,
  resume_url: z.string().url('Invalid resume URL'),
  job_id: z.string().uuid('Invalid job ID'),
});

export const AssessmentAnswerSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  answers: z.array(z.number().nonnegative()).min(1, 'At least one answer required'),
});

/**
 * Validate input and throw ValidationError if invalid
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new ValidationError(`Validation failed: ${issues}`, {
        issues: error.issues,
      });
    }
    throw error;
  }
}

/**
 * Safely validate input, return null if invalid
 */
export function validateInputSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * File upload validation
 */
export const FileUploadSchema = z.object({
  name: z.string().max(255),
  size: z.number().positive().max(10 * 1024 * 1024), // 10MB max
  type: z.string(),
});

export const PDFUploadSchema = FileUploadSchema.extend({
  type: z.literal('application/pdf'),
});

export const ImageUploadSchema = FileUploadSchema.extend({
  type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().positive().max(5 * 1024 * 1024), // 5MB for images
});

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, maxSize: number, allowedTypes: string[]): void {
  if (!file) throw new ValidationError('No file provided');
  if (file.size > maxSize) throw new ValidationError('File is too large');
  if (!allowedTypes.includes(file.type)) throw new ValidationError('Invalid file type');
}
