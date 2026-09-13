// ==============================================================================
// Prepare Application Use Case
// ==============================================================================

import { Application, PrepareApplicationInput } from "@jobpilot/types";
import { prepareApplicationSchema } from "@jobpilot/validation";
import { prepareApplication } from "@jobpilot/database";
import { UseCaseContext, getAuthUser } from "../common/context.js";

/**
 * Orchestrates application preparation:
 * 1. Validates input schema.
 * 2. Derives authenticated identity from the execution context.
 * 3. Assigns a client idempotency key if not supplied.
 * 4. Invokes the atomic database preparation operation.
 * 5. Returns the prepared application record.
 */
export async function executePrepareApplication(
  context: UseCaseContext,
  input: PrepareApplicationInput,
): Promise<Application> {
  await getAuthUser(context);

  const validated = prepareApplicationSchema.parse(input);

  const idempotencyKey = validated.idempotency_key || crypto.randomUUID();

  return prepareApplication(context.supabase, {
    ...validated,
    idempotency_key: idempotencyKey,
  });
}
