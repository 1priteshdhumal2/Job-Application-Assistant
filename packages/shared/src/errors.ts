/**
 * Standard Application Errors for JobPilot
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "NOT_FOUND_ERROR", 404, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "FORBIDDEN_ERROR", 403, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFLICT_ERROR", 409, details);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "INVALID_STATE_TRANSITION", 422, details);
  }
}

export class ConcurrencyConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "CONCURRENCY_CONFLICT", 409, details);
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "STORAGE_ERROR", 502, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "DATABASE_ERROR", 500, details);
  }
}
