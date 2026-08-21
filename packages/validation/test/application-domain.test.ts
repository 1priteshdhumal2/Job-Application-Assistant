import { describe, it, expect } from "vitest";
import { applicationSchema } from "../src/application-domain";

describe("Application Domain Validation Schema", () => {
  it("validates a correct application entry with UUID foreign keys", () => {
    const valid = applicationSchema.safeParse({
      job_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      status: "APPLIED",
      applied_at: "2026-08-21T10:00:00Z",
      resume_document_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      notes: "Submitted via company career portal",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid job UUID", () => {
    const invalid = applicationSchema.safeParse({
      job_id: "not-a-uuid",
      status: "APPLIED",
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects invalid application status", () => {
    const invalid = applicationSchema.safeParse({
      job_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      status: "NON_EXISTENT_STATUS",
    });
    expect(invalid.success).toBe(false);
  });
});
