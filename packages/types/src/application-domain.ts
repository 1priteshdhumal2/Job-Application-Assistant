// ==============================================================================
// Application Domain Contracts
// ==============================================================================

import { ApplicationAnswerInput } from "./answer-domain.js";
import { Job } from "./job-domain.js";

export type ApplicationStatus =
  | "SAVED"
  | "INTERESTED"
  | "APPLIED"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "SAVED",
  "INTERESTED",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  submitted_at: string | null;
  resume_document_id: string | null;
  cover_letter_document_id: string | null;
  notes: string | null;
  latest_preparation_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationCreateInput = Omit<
  Application,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "latest_preparation_id"
>;
export type ApplicationUpdateInput = Partial<ApplicationCreateInput>;

export interface ApplicationPreparation {
  id: string;
  user_id: string;
  job_id: string;
  application_id: string | null;
  original_application_id: string;
  preparation_number: number;
  resume_document_id: string | null;
  cover_letter_document_id: string | null;
  notes: string | null;
  status: ApplicationStatus;
  idempotency_key: string;
  payload_hash: string;
  created_at: string;
}

export interface PrepareApplicationInput {
  application_id?: string;
  job_id?: string;
  resume_document_id?: string | null;
  cover_letter_document_id?: string | null;
  notes?: string | null;
  status?: "SAVED" | "INTERESTED";
  idempotency_key?: string;
  answers?: ApplicationAnswerInput[];
}

export interface CapturePortalJobInput {
  portalCode: string;
  externalJobId: string;
  jobTitle: string;
  companyName: string;
  jobUrl: string;
  location?: string | null;
  description?: string | null;
  capturedAt?: string | null;
}

export interface CapturePortalJobResult {
  job: Job;
  application: Application;
  isNewJob: boolean;
  applicationCreated: boolean;
  applicationRestored: boolean;
}
