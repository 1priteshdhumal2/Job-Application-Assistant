// ==============================================================================
// Replace Document Version Use Case
// ==============================================================================

import { DocumentRecord } from "@jobpilot/types";
import {
  ReplaceDocumentVersionInput,
  replaceDocumentVersion,
} from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates creating a new active version for a document group:
 * 1. Derives authenticated identity from the execution context.
 * 2. Uploads new version binary and calls atomic version RPC.
 * 3. Deactivates previous version and triggers storage compensation on failure.
 * 4. Returns the created document version record.
 */
export async function executeReplaceDocumentVersion(
  context: UseCaseContext,
  documentGroupId: string,
  input: ReplaceDocumentVersionInput,
): Promise<DocumentRecord> {
  await getAuthUser(context);

  return replaceDocumentVersion(context.supabase, documentGroupId, input);
}
