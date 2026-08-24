// ==============================================================================
// Profile Preferences Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ProfilePreferences,
  ProfilePreferencesUpdateInput,
} from "@jobpilot/types";
import { profilePreferencesSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { handleDatabaseError } from "../common/errors.js";

/**
 * Fetches profile preferences for the authenticated user.
 */
export async function getProfilePreferences(
  supabase: SupabaseClient,
): Promise<ProfilePreferences | null> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("profile_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw handleDatabaseError(error, "getProfilePreferences");
  }

  return data as ProfilePreferences | null;
}

/**
 * Upserts profile preferences for the authenticated user.
 */
export async function upsertProfilePreferences(
  supabase: SupabaseClient,
  input: ProfilePreferencesUpdateInput,
): Promise<ProfilePreferences> {
  const user = await requireAuthUser(supabase);
  const validated = profilePreferencesSchema.parse(input);

  const { data, error } = await supabase
    .from("profile_preferences")
    .upsert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "upsertProfilePreferences");
  }

  return data as ProfilePreferences;
}
