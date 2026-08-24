// ==============================================================================
// Pagination Utilities
// ==============================================================================

import { PaginationParams, PaginatedResult } from "@jobpilot/types";
import { ValidationError } from "@jobpilot/shared";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface ResolvedPagination {
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

/**
 * Validates and resolves pagination parameters with clamped bounds.
 */
export function resolvePagination(
  params?: PaginationParams,
): ResolvedPagination {
  const page = params?.page ?? DEFAULT_PAGE;
  let pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;

  if (page < 1) {
    throw new ValidationError("Page number must be greater than or equal to 1");
  }

  if (pageSize < 1) {
    throw new ValidationError("Page size must be greater than or equal to 1");
  }

  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
}

/**
 * Builds a standardized PaginatedResult envelope.
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
}
