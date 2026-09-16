// ==============================================================================
// Document Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import { DOCUMENT_TYPES, USER_DOCUMENT_CATEGORIES } from "@jobpilot/types";

export const documentSchema = z.object({
  document_group_id: z.string().uuid("Invalid document group ID").optional(),
  document_type: z.enum(DOCUMENT_TYPES as unknown as [string, ...string[]]),
  category: z.enum(
    USER_DOCUMENT_CATEGORIES as unknown as [string, ...string[]],
  ),
  name: z.string().trim().min(1, "Document name is required").max(255),
  storage_path: z
    .string()
    .regex(
      /^[0-9a-fA-F-]{36}\/(resumes|cover-letters|certificates|portfolio|other)\/.+$/,
      "Invalid storage path structure",
    ),
  mime_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
  file_size: z
    .number()
    .int()
    .min(1, "File size must be greater than 0")
    .max(26214400, "File size cannot exceed 25MB"),
  content_hash: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "Invalid SHA-256 content hash")
    .optional()
    .nullable(),
  version: z.number().int().min(1, "Version must be at least 1").default(1),
  is_active: z.boolean().default(true),
});

export const documentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  version: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});
