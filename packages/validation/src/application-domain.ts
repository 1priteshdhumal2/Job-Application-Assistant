// ==============================================================================
// Application Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import { ApplicationStatus, APPLICATION_STATUSES } from "@jobpilot/types";
import { applicationAnswerInputSchema } from "./answer-domain.js";

export const applicationSchema = z.object({
  job_id: z.string().uuid("Invalid job ID"),
  status: z
    .enum(APPLICATION_STATUSES as [ApplicationStatus, ...ApplicationStatus[]])
    .default("SAVED"),
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

export const prepareApplicationSchema = z.object({
  application_id: z.string().uuid("Invalid application ID").optional(),
  job_id: z.string().uuid("Invalid job ID").optional(),
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
  status: z.enum(["SAVED", "INTERESTED"]).optional(),
  idempotency_key: z.string().uuid("Invalid idempotency key").optional(),
  answers: z.array(applicationAnswerInputSchema).optional(),
});
