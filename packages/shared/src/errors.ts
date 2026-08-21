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
