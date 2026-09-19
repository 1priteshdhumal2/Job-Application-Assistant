// ==============================================================================
// Job Domain Contracts
// ==============================================================================

export type JobStatus = "SAVED" | "INTERESTED" | "APPLIED" | "CLOSED";

export const JOB_STATUSES: JobStatus[] = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "CLOSED",
];

export interface Job {
  id: string;
  user_id: string;
  portal_id: string | null;
  external_job_id?: string | null;
  company_name: string;
  job_title: string;
  job_url: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  posted_at: string | null;
  captured_at: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type JobCreateInput = Omit<
  Job,
  "id" | "user_id" | "captured_at" | "created_at" | "updated_at"
>;
export type JobUpdateInput = Partial<JobCreateInput>;
