// ==============================================================================
// List Documents Use Case
// ==============================================================================

import {
  DocumentRecord,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import {
  listDocuments,
  DocumentListFilters,
  DocumentSortField,
} from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates listing user-owned document metadata records:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service with optional filters, pagination, and sorting.
 * 3. Returns paginated document records.
 */
export async function executeListDocuments(
  context: UseCaseContext,
  filters?: DocumentListFilters,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<DocumentSortField>,
): Promise<PaginatedResult<DocumentRecord>> {
  await getAuthUser(context);

  return listDocuments(context.supabase, filters, paginationParams, sortParams);
}
