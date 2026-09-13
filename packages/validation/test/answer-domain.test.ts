import { describe, it, expect } from "vitest";
import {
  answerBankSchema,
  applicationAnswerSchema,
} from "../src/answer-domain.js";

describe("Answer Domain Validation Schemas", () => {
  it("validates canonical answer bank entry and rejects empty answer", () => {
    const valid = answerBankSchema.safeParse({
      concept_key: "notice_period",
      question_pattern: "What is your notice period?",
      canonical_answer: "30 days",
      answer_type: "TEXT",
      sensitivity: "NORMAL",
    });
    expect(valid.success).toBe(true);

    const invalidEmpty = answerBankSchema.safeParse({
      concept_key: "notice_period",
      canonical_answer: "   ",
    });
    expect(invalidEmpty.success).toBe(false);
  });

  it("validates application answer snapshot entry", () => {
    const valid = applicationAnswerSchema.safeParse({
      preparation_id: "00000000-0000-0000-0000-000000000001",
      application_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      concept_key: "expected_ctc",
      question_text: "Expected CTC in INR",
      answer_value: "1800000",
      answer_type: "NUMBER",
      source_type: "ANSWER_BANK",
    });
    expect(valid.success).toBe(true);

    const invalidSource = applicationAnswerSchema.safeParse({
      preparation_id: "00000000-0000-0000-0000-000000000001",
      application_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      question_text: "Expected CTC in INR",
      source_type: "INVALID_SOURCE",
    });
    expect(invalidSource.success).toBe(false);
  });
});
