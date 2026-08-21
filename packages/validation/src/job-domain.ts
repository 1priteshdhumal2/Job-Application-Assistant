// ==============================================================================
// Job Domain Validation Schemas
// ==============================================================================

import { z } from "zod";
import { JOB_STATUSES } from "@jobpilot/types";

export const baseJobSchema = z.object({
  portal_id: z.string().uuid("Invalid portal ID").nullable().optional(),
  company_name: z.string().trim().min(1, "Company name is required").max(200),
  job_title: z.string().trim().min(1, "Job title is required").max(200),
  job_url: z.string().url("Invalid job URL").max(2000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  employment_type: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().max(50000).nullable().optional(),
  salary_min: z
    .number()
    .min(0, "Salary min cannot be negative")
    .nullable()
    .optional(),
  salary_max: z
    .number()
    .min(0, "Salary max cannot be negative")
    .nullable()
    .optional(),
  currency: z.string().trim().max(10).nullable().optional(),
  posted_at: z.string().datetime({ offset: true }).nullable().optional(),
  status: z
    .enum(JOB_STATUSES as unknown as [string, ...string[]])
    .default("SAVED"),
});

export const jobSchema = baseJobSchema.refine(
  (data) => {
    if (data.salary_min != null && data.salary_max != null) {
      return data.salary_max >= data.salary_min;
    }
    return true;
  },
  {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salary_max"],
  },
);

export const jobUpdateSchema = baseJobSchema.partial().refine(
  (data) => {
    if (data.salary_min != null && data.salary_max != null) {
      return data.salary_max >= data.salary_min;
    }
    return true;
  },
  {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["salary_max"],
  },
);
