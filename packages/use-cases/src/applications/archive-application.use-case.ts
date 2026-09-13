// ==============================================================================
// Archive Application Use Case
// ==============================================================================

import { softDeleteApplication } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates soft-deleting an active application:
 * 1. Derives authenticated identity from the execution context.
 * 2. Invokes database soft delete.
 */
export async function executeArchiveApplication(
  context: UseCaseContext,
  applicationId: string,
): Promise<void> {
  await getAuthUser(context);

  return softDeleteApplication(context.supabase, applicationId);
}
