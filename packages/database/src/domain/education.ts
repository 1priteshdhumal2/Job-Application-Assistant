// ==============================================================================
// Education Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Education,
  EducationCreateInput,
  EducationUpdateInput,
  SortParams,
} from "@jobpilot/types";
import { educationSchema, educationUpdateSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const EDUCATION_SORT_FIELDS = [
  "start_date",
  "created_at",
  "institution",
] as const;
export type EducationSortField = (typeof EDUCATION_SORT_FIELDS)[number];

/**
 * Lists all education records for the authenticated user.
 */
export async function listEducation(
  supabase: SupabaseClient,
  sortParams?: SortParams<EducationSortField>,
): Promise<Education[]> {
  const user = await requireAuthUser(supabase);
  const sort = resolveSort(
    sortParams,
    EDUCATION_SORT_FIELDS,
    "start_date",
    "desc",
  );

  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("user_id", user.id)
    .order(sort.column, { ascending: sort.ascending });

  if (error) {
    throw handleDatabaseError(error, "listEducation");
  }

  return (data || []) as Education[];
}

/**
 * Fetches a single education record by ID.
 */
export async function getEducation(
  supabase: SupabaseClient,
  id: string,
): Promise<Education> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getEducation");
  }

  return data as Education;
}

/**
 * Creates an education record for the authenticated user.
 */
export async function createEducation(
  supabase: SupabaseClient,
  input: EducationCreateInput,
): Promise<Education> {
  const user = await requireAuthUser(supabase);
  const validated = educationSchema.parse(input);

  const { data, error } = await supabase
    .from("education")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createEducation");
  }

  return data as Education;
}

/**
 * Updates an education record.
 */
export async function updateEducation(
  supabase: SupabaseClient,
  id: string,
  updates: EducationUpdateInput,
): Promise<Education> {
  const user = await requireAuthUser(supabase);
  const validated = educationUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("education")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateEducation");
  }

  return data as Education;
}

/**
 * Deletes an education record.
 */
export async function deleteEducation(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("education")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteEducation");
  }

  if (count === 0) {
    throw new NotFoundError("Education record not found");
  }
}
