// ==============================================================================
// Skills Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Skill,
  SkillCreateInput,
  SkillUpdateInput,
  SortParams,
} from "@jobpilot/types";
import { skillSchema, skillUpdateSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { resolveSort } from "../common/sorting.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

export const SKILL_SORT_FIELDS = [
  "skill_name",
  "years_experience",
  "created_at",
] as const;
export type SkillSortField = (typeof SKILL_SORT_FIELDS)[number];

/**
 * Lists all skill records for the authenticated user.
 */
export async function listSkills(
  supabase: SupabaseClient,
  sortParams?: SortParams<SkillSortField>,
): Promise<Skill[]> {
  const user = await requireAuthUser(supabase);
  const sort = resolveSort(sortParams, SKILL_SORT_FIELDS, "skill_name", "asc");

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", user.id)
    .order(sort.column, { ascending: sort.ascending });

  if (error) {
    throw handleDatabaseError(error, "listSkills");
  }

  return (data || []) as Skill[];
}

/**
 * Fetches a single skill record by ID.
 */
export async function getSkill(
  supabase: SupabaseClient,
  id: string,
): Promise<Skill> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getSkill");
  }

  return data as Skill;
}

/**
 * Creates a new skill record for the authenticated user.
 */
export async function createSkill(
  supabase: SupabaseClient,
  input: SkillCreateInput,
): Promise<Skill> {
  const user = await requireAuthUser(supabase);
  const validated = skillSchema.parse(input);

  const { data, error } = await supabase
    .from("skills")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createSkill");
  }

  return data as Skill;
}

/**
 * Updates an existing skill record.
 */
export async function updateSkill(
  supabase: SupabaseClient,
  id: string,
  updates: SkillUpdateInput,
): Promise<Skill> {
  const user = await requireAuthUser(supabase);
  const validated = skillUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("skills")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateSkill");
  }

  return data as Skill;
}

/**
 * Deletes a skill record.
 */
export async function deleteSkill(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("skills")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteSkill");
  }

  if (count === 0) {
    throw new NotFoundError("Skill record not found");
  }
}
