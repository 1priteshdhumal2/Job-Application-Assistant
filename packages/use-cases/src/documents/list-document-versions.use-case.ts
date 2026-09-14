// ==============================================================================
// List Document Versions Use Case
// ==============================================================================

import { DocumentRecord } from "@jobpilot/types";
import { listDocumentVersions } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates fetching all versions of a logical document group:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service for version lookup.
 * 3. Returns the array of document versions ordered descending by version.
 */
export async function executeListDocumentVersions(
  context: UseCaseContext,
  documentGroupId: string,
): Promise<DocumentRecord[]> {
  await getAuthUser(context);

  return listDocumentVersions(context.supabase, documentGroupId);
}
