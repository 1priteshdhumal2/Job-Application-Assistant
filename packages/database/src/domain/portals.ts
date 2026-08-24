// ==============================================================================
// Portals Domain Service (Global Read-Only Catalog)
// ==============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import { Portal } from "@jobpilot/types";
import { requireAuthUser } from "../common/auth.js";
import { handleDatabaseError } from "../common/errors.js";

/**
 * Lists all active portals from the global reference catalog.
 */
export async function listPortals(supabase: SupabaseClient): Promise<Portal[]> {
  await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("portals")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw handleDatabaseError(error, "listPortals");
  }

  return (data || []) as Portal[];
}

/**
 * Fetches a single portal by its unique portal code.
 */
export async function getPortalByCode(
  supabase: SupabaseClient,
  code: string,
): Promise<Portal> {
  await requireAuthUser(supabase);

  const { data, error } = await supabase
    .from("portals")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !data) {
    throw handleDatabaseError(error, "getPortalByCode");
  }

  return data as Portal;
}
