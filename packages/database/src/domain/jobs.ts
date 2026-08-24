// ==============================================================================
// Jobs Domain Service (User-Scoped Job Opportunities)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Job,
  JobCreateInput,
  JobUpdateInput,
  JobStatus,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import { jobSchema, jobUpdateSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import {
  resolvePagination,
  createPaginatedResult,
} from "../common/pagination.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const JOB_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "company_name",
  "job_title",
  "salary_min",
  "salary_max",
  "status",
] as const;
export type JobSortField = (typeof JOB_SORT_FIELDS)[number];

export interface JobListFilters {
  status?: JobStatus;
  portal_id?: string;
  company_name?: string;
  job_title?: string;
}

/**
 * Lists user-owned job postings with pagination, filtering, and allowlisted sorting.
 */
export async function listJobs(
  supabase: SupabaseClient,
  filters?: JobListFilters,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<JobSortField>,
): Promise<PaginatedResult<Job>> {
  const user = await requireAuthUser(supabase);
  const pagination = resolvePagination(paginationParams);
  const sort = resolveSort(sortParams, JOB_SORT_FIELDS, "created_at", "desc");

  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.portal_id) {
    query = query.eq("portal_id", filters.portal_id);
  }
  if (filters?.company_name) {
    // Sanitize wildcard search characters
    const sanitized = filters.company_name.replace(/[%_]/g, "\\$&");
    query = query.ilike("company_name", `%${sanitized}%`);
  }
  if (filters?.job_title) {
    const sanitized = filters.job_title.replace(/[%_]/g, "\\$&");
    query = query.ilike("job_title", `%${sanitized}%`);
  }

  query = query
    .order(sort.column, { ascending: sort.ascending })
    .range(pagination.from, pagination.to);

  const { data, count, error } = await query;

  if (error) {
    throw handleDatabaseError(error, "listJobs");
  }

  return createPaginatedResult(
    (data || []) as Job[],
    count ?? 0,
    pagination.page,
    pagination.pageSize,
  );
}

/**
 * Fetches a single job posting by ID.
 */
export async function getJob(
  supabase: SupabaseClient,
  id: string,
): Promise<Job> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getJob");
  }

  return data as Job;
}

/**
 * Creates a new user-scoped job posting.
 */
export async function createJob(
  supabase: SupabaseClient,
  input: JobCreateInput,
): Promise<Job> {
  const user = await requireAuthUser(supabase);
  const validated = jobSchema.parse(input);

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createJob");
  }

  return data as Job;
}

/**
 * Updates an existing job posting.
 */
export async function updateJob(
  supabase: SupabaseClient,
  id: string,
  updates: JobUpdateInput,
): Promise<Job> {
  const user = await requireAuthUser(supabase);
  const validated = jobUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("jobs")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateJob");
  }

  return data as Job;
}

/**
 * Deletes a job posting.
 */
export async function deleteJob(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("jobs")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteJob");
  }

  if (count === 0) {
    throw new NotFoundError("Job posting not found");
  }
}
