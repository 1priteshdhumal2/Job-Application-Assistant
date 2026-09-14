// ==============================================================================
// Download Document Use Case
// ==============================================================================

import { downloadDocument } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates downloading a user document binary:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service for ownership verification and storage fetch.
 * 3. Returns the document binary Blob.
 */
export async function executeDownloadDocument(
  context: UseCaseContext,
  id: string,
): Promise<Blob> {
  await getAuthUser(context);

  return downloadDocument(context.supabase, id);
}
