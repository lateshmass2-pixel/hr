/**
 * Centralized error handling system for the application
 * Provides type-safe error responses and structured logging
 */

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly isUserFacing: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.context && { context: this.context }),
    };
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, context, true);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', 401, message, context, true);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', 403, message, context, true);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super('NOT_FOUND', 404, `${resource} not found`, context, true);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CONFLICT', 409, message, context, true);
  }
}

export class InternalError extends ApplicationError {
  constructor(message: string = 'Internal server error', context?: Record<string, unknown>) {
    super('INTERNAL_ERROR', 500, message, context, false);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(
    service: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super('EXTERNAL_SERVICE_ERROR', 502, `${service} service error: ${message}`, context, false);
  }
}

// Type-safe response wrapper
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  statusCode: number;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Create a success response
 */
export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create an error response
 */
export function errorResponse(error: ApplicationError): ErrorResponse {
  return {
    success: false,
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
  };
}

/**
 * Handle errors safely - never expose internal details
 */
export function handleError(error: unknown): ErrorResponse {
  if (error instanceof ApplicationError) {
    return errorResponse(error);
  }

  if (error instanceof Error) {
    // Log the actual error for debugging
    console.error('[Unhandled Error]', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Return generic error to user
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  console.error('[Unknown Error]', error);
  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}

/**
 * Utility to assert a condition and throw error
 */
export function assert(condition: boolean, error: ApplicationError): asserts condition {
  if (!condition) throw error;
}

/**
 * Utility for error logging with context
 */
export function logError(error: unknown, context: Record<string, unknown>): void {
  if (error instanceof ApplicationError) {
    console.error(`[${error.code}]`, {
      message: error.message,
      statusCode: error.statusCode,
      context: { ...error.context, ...context },
    });
  } else if (error instanceof Error) {
    console.error('[UnhandledError]', {
      name: error.name,
      message: error.message,
      context,
    });
  } else {
    console.error('[Unknown]', { error, context });
  }
}
