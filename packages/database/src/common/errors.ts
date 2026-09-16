// ==============================================================================
// Database Error Mapping Utilities
// ==============================================================================

import { PostgrestError } from "@supabase/supabase-js";
import {
  AuthError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InvalidStateTransitionError,
  ConcurrencyConflictError,
  StorageError,
  DatabaseError,
} from "@jobpilot/shared";

/**
 * Maps PostgREST/PostgreSQL errors to standard JobPilot typed domain errors.
 */
export function handleDatabaseError(
  error: PostgrestError | Error | unknown,
  context: string,
): Error {
  if (!error) {
    return new DatabaseError(`Unknown error during ${context}`);
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const pgError = error as PostgrestError;

    // Custom RPC Exceptions
    if (
      pgError.message.includes("INVALID_STATUS_TRANSITION") ||
      pgError.message.includes("APPLICATION_STATUS_NOT_PREPARABLE")
    ) {
      return new InvalidStateTransitionError(pgError.message, pgError);
    }
    if (pgError.message.includes("APPLICATION_NOT_FOUND")) {
      return new NotFoundError("Application not found or is inactive", pgError);
    }
    if (pgError.message.includes("CROSS_TENANT_DOCUMENT_GROUP_VIOLATION")) {
      return new ForbiddenError(
        "Cannot add version to document group owned by another user",
        pgError,
      );
    }
    if (pgError.message.includes("immutable historical snapshots")) {
      return new ForbiddenError(
        "Application answers are immutable snapshots and cannot be modified or deleted",
        pgError,
      );
    }

    switch (pgError.code) {
      case "23505": // Unique violation
        if (
          pgError.message?.includes("uq_documents_user_content_hash") ||
          pgError.details?.includes("uq_documents_user_content_hash") ||
          pgError.message?.includes("content_hash") ||
          pgError.details?.includes("content_hash")
        ) {
          return new ConflictError(
            "A document with identical content already exists in your library",
            pgError,
          );
        }
        return new ConflictError(
          `Record conflict in ${context}: ${pgError.details || pgError.message}`,
          pgError,
        );

      case "23503": // Foreign key violation
        if (context === "deleteJob") {
          return new ConflictError(
            "Job cannot be deleted because applications exist for this job",
            pgError,
          );
        }
        return new ValidationError(
          `Referential integrity violation in ${context}: ${pgError.details || pgError.message}`,
          pgError,
        );

      case "23514": // Check constraint violation
        return new ValidationError(
          `Data constraint violation in ${context}: ${pgError.message}`,
          pgError,
        );

      case "42501": // Insufficient privilege / RLS violation
        return new ForbiddenError(
          `Access denied in ${context}: ${pgError.message}`,
          pgError,
        );

      case "PGRST116": // Result contains 0 rows when 1 was expected
        return new NotFoundError(`Record not found for ${context}`, pgError);

      case "P0001": // Raise exception
        return new ValidationError(
          `Business rule violation in ${context}: ${pgError.message}`,
          pgError,
        );

      case "P0002": // No data found
        return new NotFoundError(`Record not found for ${context}`, pgError);

      default:
        return new DatabaseError(
          `Database failure during ${context}: [${pgError.code}] ${pgError.message}`,
          pgError,
        );
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new DatabaseError(`Unexpected failure during ${context}`, error);
}

export {
  AuthError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InvalidStateTransitionError,
  ConcurrencyConflictError,
  StorageError,
  DatabaseError,
};
