/**
 * Custom error classes for structured error handling.
 *
 * All errors extend AppError so the global error handler
 * can extract the HTTP status code and response shape.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: unknown) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', details?: unknown) {
    super(message, 403, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND', details?: unknown) {
    super(message, 404, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, 429, 'RATE_LIMITED', details);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, 500, 'INTERNAL_ERROR', details);
    this.isOperational = false;
  }
}
