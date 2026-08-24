// ==============================================================================
// Session Identity Helper
// ==============================================================================

import { SupabaseClient, User } from "@supabase/supabase-js";
import { AuthError } from "@jobpilot/shared";

/**
 * Resolves the authenticated user from the active Supabase session.
 * Throws AuthError if no authenticated session exists.
 * Strictly prevents caller-supplied user IDs from bypassing authentication.
 */
export async function requireAuthUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("No authenticated user session found");
  }

  return user;
}
