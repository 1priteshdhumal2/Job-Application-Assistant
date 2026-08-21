import { describe, it, expect } from "vitest";
import { jobSchema } from "../src/job-domain";

describe("Job Domain Validation Schema", () => {
  it("validates a correct job entry", () => {
    const valid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Backend Engineer",
      salary_min: 1500000,
      salary_max: 2500000,
      currency: "INR",
      status: "SAVED",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects salary_max lower than salary_min", () => {
    const invalid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Backend Engineer",
      salary_min: 2500000,
      salary_max: 1500000,
      currency: "INR",
      status: "SAVED",
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects invalid job statuses", () => {
    const invalid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Backend Engineer",
      status: "UNKNOWN_STATUS",
    });
    expect(invalid.success).toBe(false);
  });
});
