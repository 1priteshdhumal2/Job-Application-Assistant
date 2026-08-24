// ==============================================================================
// Applications Domain Service (State Machine, Soft-Delete & Tenant Isolation)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Application,
  ApplicationCreateInput,
  ApplicationUpdateInput,
  ApplicationStatus,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import {
  applicationSchema,
  applicationUpdateSchema,
} from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import {
  resolvePagination,
  createPaginatedResult,
} from "../common/pagination.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const APPLICATION_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "applied_at",
  "status",
] as const;
export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

export interface ApplicationListFilters {
  status?: ApplicationStatus;
  job_id?: string;
}

/**
 * Lists active (non-deleted) applications for the authenticated user.
 */
export async function listApplications(
  supabase: SupabaseClient,
  filters?: ApplicationListFilters,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<ApplicationSortField>,
): Promise<PaginatedResult<Application>> {
  const user = await requireAuthUser(supabase);
  const pagination = resolvePagination(paginationParams);
  const sort = resolveSort(
    sortParams,
    APPLICATION_SORT_FIELDS,
    "created_at",
    "desc",
  );

  let query = supabase
    .from("applications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.job_id) {
    query = query.eq("job_id", filters.job_id);
  }

  query = query
    .order(sort.column, { ascending: sort.ascending })
    .range(pagination.from, pagination.to);

  const { data, count, error } = await query;

  if (error) {
    throw handleDatabaseError(error, "listApplications");
  }

  return createPaginatedResult(
    (data || []) as Application[],
    count ?? 0,
    pagination.page,
    pagination.pageSize,
  );
}

/**
 * Fetches an active (non-deleted) application by ID.
 */
export async function getApplication(
  supabase: SupabaseClient,
  id: string,
): Promise<Application> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getApplication");
  }

  return data as Application;
}

/**
 * Lists soft-deleted applications for the authenticated user.
 */
export async function listDeletedApplications(
  supabase: SupabaseClient,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<ApplicationSortField>,
): Promise<PaginatedResult<Application>> {
  const user = await requireAuthUser(supabase);
  const pagination = resolvePagination(paginationParams);
  const sort = resolveSort(
    sortParams,
    APPLICATION_SORT_FIELDS,
    "created_at",
    "desc",
  );

  const { data, count, error } = await supabase
    .from("applications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .order(sort.column, { ascending: sort.ascending })
    .range(pagination.from, pagination.to);

  if (error) {
    throw handleDatabaseError(error, "listDeletedApplications");
  }

  return createPaginatedResult(
    (data || []) as Application[],
    count ?? 0,
    pagination.page,
    pagination.pageSize,
  );
}

/**
 * Fetches a soft-deleted application by ID.
 */
export async function getDeletedApplication(
  supabase: SupabaseClient,
  id: string,
): Promise<Application> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getDeletedApplication");
  }

  return data as Application;
}

/**
 * Creates a new application record for the authenticated user.
 */
export async function createApplication(
  supabase: SupabaseClient,
  input: ApplicationCreateInput,
): Promise<Application> {
  const user = await requireAuthUser(supabase);
  const validated = applicationSchema.parse(input);

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createApplication");
  }

  return data as Application;
}

/**
 * Updates an active application (notes, document references).
 * Status cannot be updated directly; use transitionApplicationStatus.
 */
export async function updateApplication(
  supabase: SupabaseClient,
  id: string,
  updates: ApplicationUpdateInput,
): Promise<Application> {
  const user = await requireAuthUser(supabase);
  const validated = applicationUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("applications")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateApplication");
  }

  return data as Application;
}

/**
 * Transitions application status atomically via PostgreSQL stored function.
 */
export async function transitionApplicationStatus(
  supabase: SupabaseClient,
  id: string,
  nextStatus: ApplicationStatus,
): Promise<Application> {
  await requireAuthUser(supabase);

  const { data, error } = await supabase.rpc("transition_application_status", {
    p_application_id: id,
    p_to_status: nextStatus,
  });

  if (error || !data) {
    throw handleDatabaseError(error, "transitionApplicationStatus");
  }

  return data as Application;
}

/**
 * Soft-deletes an active application.
 */
export async function softDeleteApplication(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("applications")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    throw handleDatabaseError(error, "softDeleteApplication");
  }

  if (count === 0) {
    throw new NotFoundError("Application not found or already deleted");
  }
}

/**
 * Restores a soft-deleted application.
 */
export async function restoreApplication(
  supabase: SupabaseClient,
  id: string,
): Promise<Application> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("applications")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "restoreApplication");
  }

  return data as Application;
}
