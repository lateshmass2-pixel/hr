/**
 * Server Action Wrapper
 * Provides consistent error handling, validation, and type safety for server actions
 */

import { z } from 'zod';
import { ApplicationError, errorResponse, handleError, successResponse, type ApiResponse, type SuccessResponse } from './';
import { validateInput } from './validation';

/**
 * Wrap a server action with validation, error handling, and type safety
 *
 * @example
 * export const updateEmployee = createServerAction(
 *   UpdateEmployeeSchema,
 *   async (data) => {
 *     // data is already validated
 *     return { success: true, employee: updatedEmployee };
 *   }
 * );
 */
export function createServerAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput) => Promise<TOutput>
): (input: unknown) => Promise<ApiResponse<TOutput>> {
  return async function (input: unknown): Promise<ApiResponse<TOutput>> {
    try {
      // Validate input
      const validatedInput = validateInput(schema, input);

      // Execute handler
      const result = await handler(validatedInput);

      // Return success response
      return successResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof ApplicationError
          ? error
          : new ApplicationError(
              'INTERNAL_ERROR',
              500,
              error instanceof Error ? error.message : 'An unexpected error occurred',
              {},
              false
            )
      );
    }
  };
}

/**
 * Create a server action that requires authentication
 */
export function createProtectedServerAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, userId: string) => Promise<TOutput>,
  requireSession: () => Promise<{ userId: string }>
): (input: unknown) => Promise<ApiResponse<TOutput>> {
  return async function (input: unknown): Promise<ApiResponse<TOutput>> {
    try {
      const validatedInput = validateInput(schema, input);
      const session = await requireSession();

      const result = await handler(validatedInput, session.userId);
      return successResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof ApplicationError
          ? error
          : new ApplicationError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : 'Error', {}, false)
      );
    }
  };
}

/**
 * Create a permission-checking server action
 */
export function createPermissionedServerAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, userId: string) => Promise<TOutput>,
  requirePermission: (permission: string) => Promise<{ userId: string }>
): (input: unknown) => Promise<ApiResponse<TOutput>> {
  return async function (input: unknown): Promise<ApiResponse<TOutput>> {
    try {
      const validatedInput = validateInput(schema, input);
      const session = await requirePermission('required-permission');

      const result = await handler(validatedInput, session.userId);
      return successResponse(result);
    } catch (error) {
      return errorResponse(
        error instanceof ApplicationError ? error : new ApplicationError('INTERNAL_ERROR', 500, 'Error', {}, false)
      );
    }
  };
}

/**
 * Utility to safely handle errors in existing server actions
 * Use as: return handleServerError(error)
 */
export function handleServerError(error: unknown, context?: Record<string, unknown>) {
  return handleError(error);
}
