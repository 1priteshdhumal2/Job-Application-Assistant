// ==============================================================================
// Answer Bank Domain Service (User Canonical Answers)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  AnswerBankEntry,
  AnswerBankCreateInput,
  AnswerBankUpdateInput,
  AnswerSensitivity,
  AnswerType,
  PaginationParams,
  PaginatedResult,
  SortParams,
} from "@jobpilot/types";
import { answerBankSchema, answerBankUpdateSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import {
  resolvePagination,
  createPaginatedResult,
} from "../common/pagination.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const ANSWER_BANK_SORT_FIELDS = [
  "concept_key",
  "created_at",
  "updated_at",
] as const;
export type AnswerBankSortField = (typeof ANSWER_BANK_SORT_FIELDS)[number];

export interface AnswerBankListFilters {
  sensitivity?: AnswerSensitivity;
  answer_type?: AnswerType;
  requires_review?: boolean;
}

/**
 * Lists answer bank entries for the authenticated user with pagination, filtering, and sorting.
 */
export async function listAnswerBank(
  supabase: SupabaseClient,
  filters?: AnswerBankListFilters,
  paginationParams?: PaginationParams,
  sortParams?: SortParams<AnswerBankSortField>,
): Promise<PaginatedResult<AnswerBankEntry>> {
  const user = await requireAuthUser(supabase);
  const pagination = resolvePagination(paginationParams);
  const sort = resolveSort(
    sortParams,
    ANSWER_BANK_SORT_FIELDS,
    "concept_key",
    "asc",
  );

  let query = supabase
    .from("answer_bank")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (filters?.sensitivity) {
    query = query.eq("sensitivity", filters.sensitivity);
  }
  if (filters?.answer_type) {
    query = query.eq("answer_type", filters.answer_type);
  }
  if (filters?.requires_review !== undefined) {
    query = query.eq("requires_review", filters.requires_review);
  }

  query = query
    .order(sort.column, { ascending: sort.ascending })
    .range(pagination.from, pagination.to);

  const { data, count, error } = await query;

  if (error) {
    throw handleDatabaseError(error, "listAnswerBank");
  }

  return createPaginatedResult(
    (data || []) as AnswerBankEntry[],
    count ?? 0,
    pagination.page,
    pagination.pageSize,
  );
}

/**
 * Fetches an answer bank entry by ID.
 */
export async function getAnswerBankEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<AnswerBankEntry> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("answer_bank")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getAnswerBankEntry");
  }

  return data as AnswerBankEntry;
}

/**
 * Fetches an answer bank entry by concept key.
 */
export async function getAnswerByConceptKey(
  supabase: SupabaseClient,
  conceptKey: string,
): Promise<AnswerBankEntry | null> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("answer_bank")
    .select("*")
    .eq("concept_key", conceptKey)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw handleDatabaseError(error, "getAnswerByConceptKey");
  }

  return data as AnswerBankEntry | null;
}

/**
 * Creates a new answer bank entry.
 */
export async function createAnswerBankEntry(
  supabase: SupabaseClient,
  input: AnswerBankCreateInput,
): Promise<AnswerBankEntry> {
  const user = await requireAuthUser(supabase);
  const validated = answerBankSchema.parse(input);

  const { data, error } = await supabase
    .from("answer_bank")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createAnswerBankEntry");
  }

  return data as AnswerBankEntry;
}

/**
 * Updates an answer bank entry.
 */
export async function updateAnswerBankEntry(
  supabase: SupabaseClient,
  id: string,
  updates: AnswerBankUpdateInput,
): Promise<AnswerBankEntry> {
  const user = await requireAuthUser(supabase);
  const validated = answerBankUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("answer_bank")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateAnswerBankEntry");
  }

  return data as AnswerBankEntry;
}

/**
 * Deletes an answer bank entry.
 */
export async function deleteAnswerBankEntry(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("answer_bank")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteAnswerBankEntry");
  }

  if (count === 0) {
    throw new NotFoundError("Answer bank entry not found");
  }
}
