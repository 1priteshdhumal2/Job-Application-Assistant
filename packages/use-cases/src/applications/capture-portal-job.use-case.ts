// ==============================================================================
// Capture Portal Job Use Case
// ==============================================================================

import { CapturePortalJobInput, CapturePortalJobResult } from "@jobpilot/types";
import { capturePortalJobSchema } from "@jobpilot/validation";
import { capturePortalJob } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates external job capture:
 * 1. Derives authenticated identity from the execution context.
 * 2. Validates domain capture input schema.
 * 3. Invokes the atomic database capture operation (upsert job + find/restore/create application).
 * 4. Returns the structured capture result containing Job, Application, and status flags.
 */
export async function executeCapturePortalJob(
  context: UseCaseContext,
  input: CapturePortalJobInput,
): Promise<CapturePortalJobResult> {
  await getAuthUser(context);

  const validated = capturePortalJobSchema.parse(input);

  return capturePortalJob(context.supabase, validated);
}
