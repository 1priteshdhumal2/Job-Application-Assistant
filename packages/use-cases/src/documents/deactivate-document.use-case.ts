// ==============================================================================
// Deactivate Document Use Case
// ==============================================================================

import { deactivateDocument } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates archiving/deactivating an active document group:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service to mark active version is_active = false.
 * 3. Preserves all historical versions and storage objects for application referencing.
 */
export async function executeDeactivateDocument(
  context: UseCaseContext,
  documentGroupId: string,
): Promise<void> {
  await getAuthUser(context);

  return deactivateDocument(context.supabase, documentGroupId);
}
