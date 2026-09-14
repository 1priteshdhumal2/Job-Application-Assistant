// ==============================================================================
// Update Job Use Case
// ==============================================================================

import { Job, JobUpdateInput } from "@jobpilot/types";
import { updateJob } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates updating an existing user-owned job posting:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service for validation and update.
 * 3. Returns the updated job record.
 */
export async function executeUpdateJob(
  context: UseCaseContext,
  id: string,
  updates: JobUpdateInput,
): Promise<Job> {
  await getAuthUser(context);

  return updateJob(context.supabase, id, updates);
}
