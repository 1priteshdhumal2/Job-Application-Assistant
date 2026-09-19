/**
 * Normalized Portal Adapter Architecture Contracts (Phase 2D-3)
 */

export interface ExtractedJobMetadata {
  portal: string;
  externalJobId: string;
  url: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  portalCode?: string;
  jobUrl?: string;
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
  readonly supportedHostnames: readonly string[];

  isJobPage(url: string, document?: unknown): boolean;
  isApplicationPage?(url: string, document?: unknown): boolean;
  extractJobDetails(
    document: unknown,
    url: string,
  ): ExtractedJobMetadata | null;
  extractExternalJobId?(url: string, document?: unknown): string | null;
}
