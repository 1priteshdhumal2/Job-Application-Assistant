export const USER_DOCUMENT_CATEGORIES = [
  "resumes",
  "cover-letters",
  "certificates",
  "portfolio",
  "other",
] as const;

export type UserDocumentCategory = (typeof USER_DOCUMENT_CATEGORIES)[number];

export interface UserDocumentMetadata {
  name: string;
  storagePath: string;
  category: UserDocumentCategory;
  size: number;
  createdAt?: string;
  updatedAt?: string;
  mimeType?: string;
}

export interface FileUploadResult {
  storagePath: string;
  fileName: string;
  category: UserDocumentCategory;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}
