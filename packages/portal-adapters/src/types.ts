/**
 * Normalized Portal Adapter Architecture Contracts (Phase 2D-3)
 */

export interface ExtractedJobMetadata {
  externalJobId?: string;
  jobUrl: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  portalCode: string;
}

export interface DetectedFormField {
  id: string;
  name?: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "file"
    | "select"
    | "radio"
    | "checkbox"
    | "textarea";
  label?: string;
  required: boolean;
  normalizedKey?: string;
}

export interface FormFillResult {
  fieldsAttempted: number;
  fieldsFilled: number;
  unsupportedFields: string[];
}

export interface PortalAdapter {
  readonly code: string;
  readonly name: string;
  readonly baseUrl: string;

  isJobPage(url: string, document?: unknown): boolean;
  isApplicationPage(url: string, document?: unknown): boolean;
  extractJobDetails(document: unknown, url: string): ExtractedJobMetadata;
}
