// ==============================================================================
// Answer Bank and Application Answer Domain Contracts
// ==============================================================================

export type AnswerType = "TEXT" | "BOOLEAN" | "NUMBER" | "DATE" | "URL";

export const ANSWER_TYPES: AnswerType[] = [
  "TEXT",
  "BOOLEAN",
  "NUMBER",
  "DATE",
  "URL",
];

export type AnswerSensitivity = "NORMAL" | "SENSITIVE" | "NEVER_AUTOFILL";

export const ANSWER_SENSITIVITIES: AnswerSensitivity[] = [
  "NORMAL",
  "SENSITIVE",
  "NEVER_AUTOFILL",
];

export interface AnswerBankEntry {
  id: string;
  user_id: string;
  concept_key: string;
  question_pattern: string | null;
  canonical_answer: string;
  answer_type: AnswerType;
  sensitivity: AnswerSensitivity;
  requires_review: boolean;
  created_at: string;
  updated_at: string;
}

export type AnswerBankCreateInput = Omit<
  AnswerBankEntry,
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type AnswerBankUpdateInput = Partial<AnswerBankCreateInput>;

export type AnswerSourceType =
  "USER" | "PROFILE" | "ANSWER_BANK" | "AI_GENERATED";

export const ANSWER_SOURCE_TYPES: AnswerSourceType[] = [
  "USER",
  "PROFILE",
  "ANSWER_BANK",
  "AI_GENERATED",
];

export interface ApplicationAnswer {
  id: string;
  user_id: string;
  application_id: string;
  concept_key: string | null;
  question_text: string;
  answer_value: string | null;
  answer_type: AnswerType;
  source_type: AnswerSourceType;
  requires_review: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationAnswerCreateInput = Omit<
  ApplicationAnswer,
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type ApplicationAnswerUpdateInput =
  Partial<ApplicationAnswerCreateInput>;
