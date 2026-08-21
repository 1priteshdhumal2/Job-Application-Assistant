// ==============================================================================
// Answer Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import {
  ANSWER_SENSITIVITIES,
  ANSWER_SOURCE_TYPES,
  ANSWER_TYPES,
} from "@jobpilot/types";

export const answerBankSchema = z.object({
  concept_key: z.string().trim().min(1, "Concept key is required").max(100),
  question_pattern: z.string().trim().max(500).nullable().optional(),
  canonical_answer: z
    .string()
    .trim()
    .min(1, "Canonical answer cannot be empty")
    .max(10000),
  answer_type: z
    .enum(ANSWER_TYPES as unknown as [string, ...string[]])
    .default("TEXT"),
  sensitivity: z
    .enum(ANSWER_SENSITIVITIES as unknown as [string, ...string[]])
    .default("NORMAL"),
  requires_review: z.boolean().default(false),
});

export const answerBankUpdateSchema = answerBankSchema.partial();

export const applicationAnswerSchema = z.object({
  application_id: z.string().uuid("Invalid application ID"),
  concept_key: z.string().trim().max(100).nullable().optional(),
  question_text: z
    .string()
    .trim()
    .min(1, "Question text is required")
    .max(1000),
  answer_value: z.string().trim().max(10000).nullable().optional(),
  answer_type: z
    .enum(ANSWER_TYPES as unknown as [string, ...string[]])
    .default("TEXT"),
  source_type: z
    .enum(ANSWER_SOURCE_TYPES as unknown as [string, ...string[]])
    .default("USER"),
  requires_review: z.boolean().default(false),
  approved_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const applicationAnswerUpdateSchema = applicationAnswerSchema
  .partial()
  .omit({ application_id: true });
