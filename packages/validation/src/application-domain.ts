// ==============================================================================
// Application Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import { APPLICATION_STATUSES } from "@jobpilot/types";

export const applicationSchema = z.object({
  job_id: z.string().uuid("Invalid job ID"),
  status: z
    .enum(APPLICATION_STATUSES as unknown as [string, ...string[]])
    .default("APPLIED"),
  applied_at: z.string().datetime({ offset: true }).nullable().optional(),
  submitted_at: z.string().datetime({ offset: true }).nullable().optional(),
  resume_document_id: z
    .string()
    .uuid("Invalid resume document ID")
    .nullable()
    .optional(),
  cover_letter_document_id: z
    .string()
    .uuid("Invalid cover letter document ID")
    .nullable()
    .optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
});

export const applicationUpdateSchema = applicationSchema
  .partial()
  .omit({ job_id: true });
