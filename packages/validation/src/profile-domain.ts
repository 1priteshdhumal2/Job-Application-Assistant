// ==============================================================================
// Profile Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import { PROFILE_LINK_TYPES } from "@jobpilot/types";

export const profilePersonalSchema = z.object({
  first_name: z.string().trim().max(100).nullable().optional(),
  middle_name: z.string().trim().max(100).nullable().optional(),
  last_name: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  professional_title: z.string().trim().max(200).nullable().optional(),
  current_company: z.string().trim().max(200).nullable().optional(),
  current_designation: z.string().trim().max(200).nullable().optional(),
  notice_period_days: z
    .number()
    .int()
    .min(0, "Notice period days cannot be negative")
    .max(365, "Notice period days too high")
    .nullable()
    .optional(),
  work_authorization_status: z.string().trim().max(100).nullable().optional(),
  requires_sponsorship: z.boolean().nullable().optional(),
  willing_to_relocate: z.boolean().nullable().optional(),
});

export const experienceSchema = z
  .object({
    company_name: z.string().trim().min(1, "Company name is required").max(200),
    job_title: z.string().trim().min(1, "Job title is required").max(200),
    employment_type: z.string().trim().max(100).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)")
      .nullable()
      .optional(),
    is_current: z.boolean().default(false),
    description: z.string().trim().max(5000).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.is_current && data.end_date) {
        return false;
      }
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message:
        "End date must be after start date, and cannot be set for current employment",
      path: ["end_date"],
    },
  );

export const educationSchema = z
  .object({
    institution: z.string().trim().min(1, "Institution is required").max(200),
    degree: z.string().trim().max(200).nullable().optional(),
    field_of_study: z.string().trim().max(200).nullable().optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)")
      .nullable()
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)")
      .nullable()
      .optional(),
    grade: z.string().trim().max(50).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    },
  );

export const skillSchema = z.object({
  skill_name: z.string().trim().min(1, "Skill name is required").max(100),
  proficiency: z.string().trim().max(50).nullable().optional(),
  years_experience: z
    .number()
    .min(0, "Years of experience cannot be negative")
    .max(50, "Years of experience cannot exceed 50")
    .nullable()
    .optional(),
  last_used_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid last used date format (YYYY-MM-DD)")
    .nullable()
    .optional(),
});

export const certificationSchema = z
  .object({
    name: z.string().trim().min(1, "Certification name is required").max(200),
    issuer: z.string().trim().max(200).nullable().optional(),
    credential_id: z.string().trim().max(200).nullable().optional(),
    issue_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid issue date format (YYYY-MM-DD)")
      .nullable()
      .optional(),
    expiry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid expiry date format (YYYY-MM-DD)")
      .nullable()
      .optional(),
    verification_url: z
      .string()
      .url("Invalid verification URL")
      .max(1000)
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.issue_date && data.expiry_date) {
        return new Date(data.expiry_date) >= new Date(data.issue_date);
      }
      return true;
    },
    {
      message: "Expiry date must be after issue date",
      path: ["expiry_date"],
    },
  );

export const languageSchema = z.object({
  language: z.string().trim().min(1, "Language is required").max(100),
  proficiency: z.string().trim().max(50).nullable().optional(),
});

export const profileLinkSchema = z.object({
  link_type: z.enum(PROFILE_LINK_TYPES as unknown as [string, ...string[]]),
  url: z.string().url("Invalid URL").max(1000),
  label: z.string().trim().max(100).nullable().optional(),
});

export const profilePreferencesSchema = z.object({
  remote_preference: z.string().trim().max(100).nullable().optional(),
  preferred_locations: z.array(z.string().trim().max(100)).default([]),
  preferred_roles: z.array(z.string().trim().max(100)).default([]),
  employment_types: z.array(z.string().trim().max(100)).default([]),
  preferred_industries: z.array(z.string().trim().max(100)).default([]),
  minimum_expected_ctc: z
    .number()
    .min(0, "Expected CTC cannot be negative")
    .nullable()
    .optional(),
  preferred_currency: z.string().trim().max(10).nullable().optional(),
  willing_to_relocate: z.boolean().nullable().optional(),
});
