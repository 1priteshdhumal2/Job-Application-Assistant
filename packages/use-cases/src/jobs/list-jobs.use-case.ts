// ==============================================================================
// List Jobs Use Case
// ==============================================================================

import {
  Job,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import { listJobs, JobListFilters, JobSortField } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates listing user-owned job postings:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service with filters, pagination, and sorting.
 * 3. Returns paginated job results.
 */
export async function executeListJobs(
  context: UseCaseContext,
  filters?: JobListFilters,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<JobSortField>,
): Promise<PaginatedResult<Job>> {
  await getAuthUser(context);

  return listJobs(context.supabase, filters, paginationParams, sortParams);
}
