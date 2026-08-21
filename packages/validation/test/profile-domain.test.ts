import { describe, it, expect } from "vitest";
import {
  profilePersonalSchema,
  experienceSchema,
  educationSchema,
  skillSchema,
  certificationSchema,
  languageSchema,
  profileLinkSchema,
  profilePreferencesSchema,
} from "../src/profile-domain";

describe("Profile Domain Validation Schemas", () => {
  it("validates personal profile inputs and rejects negative notice period", () => {
    const valid = profilePersonalSchema.safeParse({
      first_name: "Jane",
      last_name: "Doe",
      notice_period_days: 30,
      requires_sponsorship: false,
    });
    expect(valid.success).toBe(true);

    const invalid = profilePersonalSchema.safeParse({
      notice_period_days: -5,
    });
    expect(invalid.success).toBe(false);
  });

  it("validates experience date ordering and current employment status", () => {
    const valid = experienceSchema.safeParse({
      company_name: "Tech Corp",
      job_title: "Software Engineer",
      start_date: "2022-01-01",
      end_date: "2023-01-01",
      is_current: false,
    });
    expect(valid.success).toBe(true);

    const invalidDates = experienceSchema.safeParse({
      company_name: "Tech Corp",
      job_title: "Software Engineer",
      start_date: "2023-01-01",
      end_date: "2022-01-01",
      is_current: false,
    });
    expect(invalidDates.success).toBe(false);

    const invalidCurrentWithEnd = experienceSchema.safeParse({
      company_name: "Tech Corp",
      job_title: "Software Engineer",
      start_date: "2022-01-01",
      end_date: "2023-01-01",
      is_current: true,
    });
    expect(invalidCurrentWithEnd.success).toBe(false);
  });

  it("validates education dates and degrees", () => {
    const valid = educationSchema.safeParse({
      institution: "State University",
      degree: "B.S. Computer Science",
      start_date: "2018-09-01",
      end_date: "2022-05-01",
    });
    expect(valid.success).toBe(true);

    const invalid = educationSchema.safeParse({
      institution: "State University",
      start_date: "2022-05-01",
      end_date: "2018-09-01",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates skills and non-negative years of experience", () => {
    const valid = skillSchema.safeParse({
      skill_name: "TypeScript",
      proficiency: "Expert",
      years_experience: 5.5,
    });
    expect(valid.success).toBe(true);

    const invalid = skillSchema.safeParse({
      skill_name: "TypeScript",
      years_experience: -1,
    });
    expect(invalid.success).toBe(false);
  });

  it("validates certifications and verification URLs", () => {
    const valid = certificationSchema.safeParse({
      name: "AWS Solutions Architect",
      issuer: "Amazon Web Services",
      issue_date: "2023-01-01",
      expiry_date: "2026-01-01",
      verification_url: "https://aws.amazon.com/verify/12345",
    });
    expect(valid.success).toBe(true);

    const invalidUrl = certificationSchema.safeParse({
      name: "AWS Solutions Architect",
      verification_url: "not-a-valid-url",
    });
    expect(invalidUrl.success).toBe(false);
  });

  it("validates language and profile links", () => {
    const validLang = languageSchema.safeParse({
      language: "English",
      proficiency: "Fluent",
    });
    expect(validLang.success).toBe(true);

    const validLink = profileLinkSchema.safeParse({
      link_type: "LINKEDIN",
      url: "https://linkedin.com/in/testuser",
    });
    expect(validLink.success).toBe(true);

    const invalidLinkType = profileLinkSchema.safeParse({
      link_type: "MY_CUSTOM_LINK",
      url: "https://example.com",
    });
    expect(invalidLinkType.success).toBe(false);
  });

  it("validates preferences and CTC", () => {
    const valid = profilePreferencesSchema.safeParse({
      preferred_roles: ["Frontend Developer", "Full Stack Developer"],
      minimum_expected_ctc: 1200000,
      preferred_currency: "INR",
    });
    expect(valid.success).toBe(true);

    const invalid = profilePreferencesSchema.safeParse({
      minimum_expected_ctc: -100,
    });
    expect(invalid.success).toBe(false);
  });
});
