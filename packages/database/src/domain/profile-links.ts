// ==============================================================================
// Profile Links Domain Service
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ProfileLink,
  ProfileLinkCreateInput,
  ProfileLinkUpdateInput,
} from "@jobpilot/types";
import {
  profileLinkSchema,
  profileLinkUpdateSchema,
} from "@jobpilot/validation";
import { requireAuthUser } from "../common/auth.js";
import { handleDatabaseError, NotFoundError } from "../common/errors.js";

/**
 * Lists all profile links for the authenticated user.
 */
export async function listProfileLinks(
  supabase: SupabaseClient,
): Promise<ProfileLink[]> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("profile_links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw handleDatabaseError(error, "listProfileLinks");
  }

  return (data || []) as ProfileLink[];
}

/**
 * Fetches a single profile link by ID.
 */
export async function getProfileLink(
  supabase: SupabaseClient,
  id: string,
): Promise<ProfileLink> {
  const user = await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("profile_links")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getProfileLink");
  }

  return data as ProfileLink;
}

/**
 * Creates a new profile link for the authenticated user.
 */
export async function createProfileLink(
  supabase: SupabaseClient,
  input: ProfileLinkCreateInput,
): Promise<ProfileLink> {
  const user = await requireAuthUser(supabase);
  const validated = profileLinkSchema.parse(input);

  const { data, error } = await supabase
    .from("profile_links")
    .insert({
      user_id: user.id,
      ...validated,
    })
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "createProfileLink");
  }

  return data as ProfileLink;
}

/**
 * Updates an existing profile link.
 */
export async function updateProfileLink(
  supabase: SupabaseClient,
  id: string,
  updates: ProfileLinkUpdateInput,
): Promise<ProfileLink> {
  const user = await requireAuthUser(supabase);
  const validated = profileLinkUpdateSchema.parse(updates);

  const { data, error } = await supabase
    .from("profile_links")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "updateProfileLink");
  }

  return data as ProfileLink;
}

/**
 * Deletes a profile link.
 */
export async function deleteProfileLink(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const user = await requireAuthUser(supabase);

  const { error, count } = await supabase
    .from("profile_links")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw handleDatabaseError(error, "deleteProfileLink");
  }

  if (count === 0) {
    throw new NotFoundError("Profile link not found");
  }
}
