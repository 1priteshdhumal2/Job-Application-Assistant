// ==============================================================================
// Languages Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Language,
  LanguageCreateInput,
  LanguageUpdateInput,
  SortParams,
} from "@jobpilot/types";
import { languageSchema, languageUpdateSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const LANGUAGE_SORT_FIELDS = ["language", "created_at"] as const;
export type LanguageSortField = (typeof LANGUAGE_SORT_FIELDS)[number];

/**
 * Lists all language records for the authenticated user.
 */
export async function listLanguages(
  supabase: SupabaseClient,
  sortParams?: SortParams<LanguageSortField>,
): Promise<Language[]> {
  const user = await requireAuthUser(supabase);
  const sort = resolveSort(sortParams, LANGUAGE_SORT_FIELDS, "language", "asc");

  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .eq("user_id", user.id)
    .order(sort.column, { ascending: sort.ascending });

  if (error) {
    throw handleDatabaseError(error, "listLanguages");
  }

  return (data || []) as Language[];
}

/**
 * Fetches a single language record by ID.
 */
export async function getLanguage(
  supabase: SupabaseClient,
  id: string,
): Promise<Language> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getLanguage");
  }

  return data as Language;
}

/**
 * Creates a new language record for the authenticated user.
 */
export async function createLanguage(
  supabase: SupabaseClient,
  input: LanguageCreateInput,
): Promise<Language> {
  const user = await requireAuthUser(supabase);
  const validated = languageSchema.parse(input);

  const { data, error } = await supabase
    .from("languages")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createLanguage");
  }

  return data as Language;
}

/**
 * Updates an existing language record.
 */
export async function updateLanguage(
  supabase: SupabaseClient,
  id: string,
  updates: LanguageUpdateInput,
): Promise<Language> {
  const user = await requireAuthUser(supabase);
  const validated = languageUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("languages")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateLanguage");
  }

  return data as Language;
}

/**
 * Deletes a language record.
 */
export async function deleteLanguage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("languages")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteLanguage");
  }

  if (count === 0) {
    throw new NotFoundError("Language record not found");
  }
}
