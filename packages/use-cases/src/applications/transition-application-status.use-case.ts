// ==============================================================================
// Transition Application Status Use Case
// ==============================================================================

import { Application, ApplicationStatus } from "@jobpilot/types";
import { transitionApplicationStatus } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates atomic status transition for an application:
 * 1. Derives authenticated identity from the execution context.
 * 2. Invokes the atomic database status transition stored function.
 * 3. Returns the updated application record.
 */
export async function executeTransitionApplicationStatus(
  context: UseCaseContext,
  applicationId: string,
  nextStatus: ApplicationStatus,
): Promise<Application> {
  await getAuthUser(context);

  return transitionApplicationStatus(
    context.supabase,
    applicationId,
    nextStatus,
  );
}
