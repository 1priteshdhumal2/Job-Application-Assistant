// ==============================================================================
// Upload User Document Use Case
// ==============================================================================

import { DocumentRecord } from "@jobpilot/types";
import { UploadDocumentInput, uploadDocument } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates user document upload:
 * 1. Derives authenticated identity from the execution context.
 * 2. Uploads binary to private storage with compensation cleanup on metadata failure.
 * 3. Returns the created document metadata record.
 */
export async function executeUploadUserDocument(
  context: UseCaseContext,
  input: UploadDocumentInput,
): Promise<DocumentRecord> {
  await getAuthUser(context);

  return uploadDocument(context.supabase, input);
}
