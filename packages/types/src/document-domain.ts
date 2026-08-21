// ==============================================================================
// Document Domain Contracts
// ==============================================================================

import { UserDocumentCategory } from "./storage.js";

export type DocumentType =
  "RESUME" | "COVER_LETTER" | "CERTIFICATE" | "PORTFOLIO" | "OTHER";

export const DOCUMENT_TYPES: DocumentType[] = [
  "RESUME",
  "COVER_LETTER",
  "CERTIFICATE",
  "PORTFOLIO",
  "OTHER",
];

export interface DocumentRecord {
  id: string;
  user_id: string;
  document_type: DocumentType;
  category: UserDocumentCategory;
  name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentCreateInput = {
  document_type: DocumentType;
  category: UserDocumentCategory;
  name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version?: number;
  is_active?: boolean;
};

export type DocumentUpdateInput = Partial<
  Pick<DocumentRecord, "name" | "is_active" | "version">
>;
