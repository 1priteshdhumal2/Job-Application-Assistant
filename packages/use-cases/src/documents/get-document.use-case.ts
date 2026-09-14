// ==============================================================================
// Get Document Use Case
// ==============================================================================

import { DocumentRecord } from "@jobpilot/types";
import { getDocument } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates fetching a single user-owned document metadata record:
 * 1. Derives authenticated identity from the execution context.
 * 2. Delegates to database domain service for lookup.
 * 3. Returns the document metadata record.
 */
export async function executeGetDocument(
  context: UseCaseContext,
  id: string,
): Promise<DocumentRecord> {
  await getAuthUser(context);

  return getDocument(context.supabase, id);
}
