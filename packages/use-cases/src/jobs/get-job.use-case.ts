// ==============================================================================
// Get Job Use Case
// ==============================================================================

import { Job } from "@jobpilot/types";
import { getJob } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates fetching a single user-owned job posting:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service.
 * 3. Returns the job record.
 */
export async function executeGetJob(
  context: UseCaseContext,
  id: string,
): Promise<Job> {
  await getAuthUser(context);

  return getJob(context.supabase, id);
}
