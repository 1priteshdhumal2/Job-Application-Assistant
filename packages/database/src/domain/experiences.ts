// ==============================================================================
// Experiences Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Experience,
  ExperienceCreateInput,
  ExperienceUpdateInput,
  SortParams,
} from "@jobpilot/types";
import { experienceSchema, experienceUpdateSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const EXPERIENCE_SORT_FIELDS = [
  "start_date",
  "created_at",
  "company_name",
] as const;
export type ExperienceSortField = (typeof EXPERIENCE_SORT_FIELDS)[number];

/**
 * Lists all work experience records for the authenticated user.
 */
export async function listExperiences(
  supabase: SupabaseClient,
  sortParams?: SortParams<ExperienceSortField>,
): Promise<Experience[]> {
  const user = await requireAuthUser(supabase);
  const sort = resolveSort(
    sortParams,
    EXPERIENCE_SORT_FIELDS,
    "start_date",
    "desc",
  );

  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", user.id)
    .order(sort.column, { ascending: sort.ascending });

  if (error) {
    throw handleDatabaseError(error, "listExperiences");
  }

  return (data || []) as Experience[];
}

/**
 * Fetches a single work experience record by ID.
 */
export async function getExperience(
  supabase: SupabaseClient,
  id: string,
): Promise<Experience> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getExperience");
  }

  return data as Experience;
}

/**
 * Creates a new work experience record for the authenticated user.
 */
export async function createExperience(
  supabase: SupabaseClient,
  input: ExperienceCreateInput,
): Promise<Experience> {
  const user = await requireAuthUser(supabase);
  const validated = experienceSchema.parse(input);

  const { data, error } = await supabase
    .from("experiences")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createExperience");
  }

  return data as Experience;
}

/**
 * Updates an existing work experience record.
 */
export async function updateExperience(
  supabase: SupabaseClient,
  id: string,
  updates: ExperienceUpdateInput,
): Promise<Experience> {
  const user = await requireAuthUser(supabase);
  const validated = experienceUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("experiences")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateExperience");
  }

  return data as Experience;
}

/**
 * Deletes a work experience record.
 */
export async function deleteExperience(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("experiences")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteExperience");
  }

  if (count === 0) {
    throw new NotFoundError("Experience record not found");
  }
}
