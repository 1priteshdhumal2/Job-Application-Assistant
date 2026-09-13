// ==============================================================================
// Use Case Execution Context
// ==============================================================================

import { SupabaseClient, User } from "@jobpilot/database";
import { requireAuthUser } from "@jobpilot/database";

export interface UseCaseContext {
  supabase: SupabaseClient;
}

/**
 * Helper to ensure the authenticated user is resolved from the execution context.
 */
export async function getAuthUser(context: UseCaseContext): Promise<User> {
  return requireAuthUser(context.supabase);
}
