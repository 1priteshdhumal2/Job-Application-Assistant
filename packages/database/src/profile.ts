import { SupabaseClient } from "@supabase/supabase-js";
import { Profile, ProfileUpdateInput, createUserId } from "@jobpilot/types";
import { validateProfileUpdate } from "@jobpilot/validation";
import { AuthError, NotFoundError } from "@jobpilot/shared";

/**
 * Fetches the profile for the currently authenticated Supabase user.
 * Identity is strictly derived from the authenticated session (supabase.auth.getUser()).
 */
export async function getCurrentProfile(
  supabase: SupabaseClient,
): Promise<Profile | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("No authenticated user session found");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return null;
    }
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return {
    id: createUserId(data.id),
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    onboarding_status: data.onboarding_status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Updates the profile for the currently authenticated Supabase user.
 * Disallows arbitrary user ID input from the caller.
 */
export async function updateCurrentProfile(
  supabase: SupabaseClient,
  updates: ProfileUpdateInput,
): Promise<Profile> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("No authenticated user session found");
  }

  const validated = validateProfileUpdate(updates);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: validated.display_name,
      avatar_url: validated.avatar_url,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError(
      `Failed to update profile: ${error?.message || "Profile not found"}`,
    );
  }

  return {
    id: createUserId(data.id),
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    onboarding_status: data.onboarding_status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
