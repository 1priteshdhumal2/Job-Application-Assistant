// ==============================================================================
// Portal Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import { PORTAL_TYPES } from "@jobpilot/types";

export const portalSchema = z.object({
  code: z.string().trim().min(1, "Portal code is required").max(50),
  name: z.string().trim().min(1, "Portal name is required").max(100),
  portal_type: z.enum(PORTAL_TYPES as unknown as [string, ...string[]]),
  base_url: z.string().url("Invalid base URL").max(1000).nullable().optional(),
  is_active: z.boolean().default(true),
});
