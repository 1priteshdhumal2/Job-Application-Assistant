// ==============================================================================
// Create Job Use Case
// ==============================================================================

import { Job, JobCreateInput } from "@jobpilot/types";
import { createJob } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates creating a new user-owned job posting:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service for validation and persistence.
 * 3. Returns the created job record.
 */
export async function executeCreateJob(
  context: UseCaseContext,
  input: JobCreateInput,
): Promise<Job> {
  await getAuthUser(context);

  return createJob(context.supabase, input);
}
