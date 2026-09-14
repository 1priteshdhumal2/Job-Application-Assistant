// ==============================================================================
// Delete Job Use Case
// ==============================================================================

import { deleteJob } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates deleting an existing user-owned job posting:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service for deletion.
 * 3. Throws ConflictError if linked applications exist (ON DELETE RESTRICT).
 */
export async function executeDeleteJob(
  context: UseCaseContext,
  id: string,
): Promise<void> {
  await getAuthUser(context);

  return deleteJob(context.supabase, id);
}
