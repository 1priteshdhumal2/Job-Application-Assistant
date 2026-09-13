// ==============================================================================
// Restore Application Use Case
// ==============================================================================

import { Application } from "@jobpilot/types";
import { restoreApplication } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates restoring a soft-deleted application:
 * 1. Derives authenticated identity from the execution context.
 * 2. Invokes database restore.
 * 3. Returns the restored application record.
 */
export async function executeRestoreApplication(
  context: UseCaseContext,
  applicationId: string,
): Promise<Application> {
  await getAuthUser(context);

  return restoreApplication(context.supabase, applicationId);
}
