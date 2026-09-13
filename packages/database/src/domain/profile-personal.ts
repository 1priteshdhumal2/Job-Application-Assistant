// ==============================================================================
// Profile Personal Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { ProfilePersonal, ProfilePersonalUpdateInput } from "@jobpilot/types";
import { profilePersonalSchema } from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { handleDatabaseError } from "../common/errors.js";

/**
 * Fetches the personal profile for the authenticated user.
 */
export async function getPersonalProfile(
  supabase: SupabaseClient,
): Promise<ProfilePersonal | null> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("profile_personal")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw handleDatabaseError(error, "getPersonalProfile");
  }

  return data as ProfilePersonal | null;
}

/**
 * Upserts personal profile details for the authenticated user.
 */
export async function upsertPersonalProfile(
  supabase: SupabaseClient,
  input: ProfilePersonalUpdateInput,
): Promise<ProfilePersonal> {
  const user = await requireAuthUser(supabase);
  const validated = profilePersonalSchema.parse(input);

  const { data, error } = await supabase
    .from("profile_personal")
    .upsert(
      {
        user_id: user.id,
        ...validated,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "upsertPersonalProfile");
  }

  return data as ProfilePersonal;
}
