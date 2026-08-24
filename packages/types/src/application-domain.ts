// ==============================================================================
// Application Domain Contracts
// ==============================================================================

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
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationCreateInput = Omit<
  Application,
  "id" | "user_id" | "created_at" | "updated_at" | "deleted_at"
>;
export type ApplicationUpdateInput = Partial<ApplicationCreateInput>;
