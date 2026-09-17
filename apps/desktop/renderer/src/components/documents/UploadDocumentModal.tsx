import React, { useState, useEffect } from "react";
import type { ReactElement } from "react";
import type {
  DocumentType,
  UserDocumentCategory,
  SelectedDocumentFile,
  DocumentRecord,
} from "@jobpilot/types";
import { executeUploadUserDocument } from "@jobpilot/use-cases";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  validateFileForUpload,
} from "@jobpilot/validation";
import { useAuth } from "../../auth/useAuth";
import type { SupabaseClient } from "@jobpilot/database";

export interface UploadDocumentModalProps {
  isOpen: boolean;
  file: SelectedDocumentFile | null;
  onClose: () => void;
  onSuccess: (document: DocumentRecord) => void;
  supabase?: SupabaseClient | null;
}

export const DOCUMENT_TYPE_OPTIONS: Array<{
  value: DocumentType;
  label: string;
  category: UserDocumentCategory;
}> = [
  { value: "RESUME", label: "Resume", category: "resumes" },
  { value: "COVER_LETTER", label: "Cover Letter", category: "cover-letters" },
  { value: "CERTIFICATE", label: "Certificate", category: "certificates" },
  { value: "PORTFOLIO", label: "Portfolio", category: "portfolio" },
  { value: "OTHER", label: "Other", category: "other" },
];

export function getCategoryFromDocumentType(
  type: DocumentType | "",
): UserDocumentCategory | "" {
  switch (type) {
    case "RESUME":
      return "resumes";
    case "COVER_LETTER":
      return "cover-letters";
    case "CERTIFICATE":
      return "certificates";
    case "PORTFOLIO":
      return "portfolio";
    case "OTHER":
      return "other";
    default:
      return "";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getInitialDocumentName(fileName: string): string {
  if (!fileName) return "";
  return fileName.replace(/\.[^/.]+$/, "");
}

export function UploadDocumentModal({
  isOpen,
  file,
  onClose,
  onSuccess,
  supabase: supabaseProp,
}: UploadDocumentModalProps): ReactElement | null {
  const auth = useAuth();
  const supabase = supabaseProp || auth.supabase;

  const [documentName, setDocumentName] = useState<string>(
    file ? getInitialDocumentName(file.fileName) : "",
  );
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Synchronize state when a new file is received or modal opens
  useEffect(() => {
    if (file) {
      setDocumentName(getInitialDocumentName(file.fileName));
      setDocumentType("");
      setError(null);
      setIsUploading(false);

      // Validate file upon receipt
      if (file.fileSize <= 0) {
        setError("File must not be empty.");
      } else if (file.fileSize > MAX_FILE_SIZE_BYTES) {
        setError("File size exceeds maximum allowed limit of 25 MB.");
      } else {
        const ext = file.fileName.substring(file.fileName.lastIndexOf("."));
        const hasValidExt = ALLOWED_EXTENSIONS.some(
          (validExt) => validExt.toLowerCase() === ext.toLowerCase(),
        );
        if (!hasValidExt) {
          setError(
            "Invalid file format. Allowed formats are: .pdf, .docx, .xlsx",
          );
        }
      }
    }
  }, [file, isOpen]);

  if (!isOpen || !file) {
    return null;
  }

  const derivedCategory = getCategoryFromDocumentType(documentType);
  const isFormValid =
    Boolean(documentName.trim()) &&
    Boolean(documentType) &&
    !error &&
    !isUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setError("Authentication required to upload documents.");
      return;
    }

    if (!documentName.trim()) {
      setError("Document name is required.");
      return;
    }

    if (!documentType) {
      setError("Please select a document type.");
      return;
    }

    const category = getCategoryFromDocumentType(documentType);
    if (!category) {
      setError("Invalid document type selected.");
      return;
    }

    // Determine final filename with extension
    const extIndex = file.fileName.lastIndexOf(".");
    const ext = extIndex !== -1 ? file.fileName.substring(extIndex) : ".pdf";
    const trimmedName = documentName.trim();
    const finalFileName = trimmedName.toLowerCase().endsWith(ext.toLowerCase())
      ? trimmedName
      : `${trimmedName}${ext}`;

    // Validate file with domain validator
    const fileValidation = validateFileForUpload({
      name: finalFileName,
      size: file.fileSize,
      type: file.mimeType || "application/octet-stream",
    });

    if (!fileValidation.valid) {
      setError(fileValidation.error || "File validation failed.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const blob = new Blob([file.fileData as unknown as BlobPart], {
        type: file.mimeType || "application/octet-stream",
      });

      const uploadedDoc = await executeUploadUserDocument(
        { supabase },
        {
          file: blob,
          fileName: finalFileName,
          name: trimmedName,
          category,
          documentType,
        },
      );

      setIsUploading(false);
      onSuccess(uploadedDoc);
    } catch (err: unknown) {
      setIsUploading(false);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload document.";

      if (
        errorMessage
          .toLowerCase()
          .includes("identical content already exists") ||
        errorMessage.toLowerCase().includes("duplicate") ||
        errorMessage.toLowerCase().includes("conflict")
      ) {
        setError(
          "A document with identical content already exists in your library.",
        );
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    if (isUploading) return;
    setError(null);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="modal-dialog upload-document-dialog">
        <h2 id="upload-modal-title" className="modal-title">
          Upload Document
        </h2>

        {/* Selected File Summary Card */}
        <div className="file-info-summary">
          <div className="file-info-header">
            <span className="file-info-icon" aria-hidden="true">
              📄
            </span>
            <div className="file-info-meta">
              <span className="file-info-name" title={file.fileName}>
                {file.fileName}
              </span>
              <span className="file-info-size">
                {formatFileSize(file.fileSize)} •{" "}
                {file.mimeType || "Unknown type"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="alert alert-error"
            role="alert"
            id="upload-error-alert"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="upload-document-form">
          {/* Document Name Field */}
          <div className="form-group">
            <label htmlFor="upload-doc-name" className="form-label">
              Document Name <span className="required-star">*</span>
            </label>
            <input
              id="upload-doc-name"
              type="text"
              className="form-input"
              value={documentName}
              onChange={(e) => {
                setDocumentName(e.target.value);
                if (error && error.includes("Document name is required")) {
                  setError(null);
                }
              }}
              placeholder="e.g. Senior Software Engineer Resume"
              disabled={isUploading}
              required
              maxLength={255}
              autoFocus
            />
          </div>

          {/* Document Type Field */}
          <div className="form-group">
            <label htmlFor="upload-doc-type" className="form-label">
              Document Type <span className="required-star">*</span>
            </label>
            <select
              id="upload-doc-type"
              className="form-input form-select"
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value as DocumentType);
                if (error && error.includes("select a document type")) {
                  setError(null);
                }
              }}
              disabled={isUploading}
              required
            >
              <option value="">Select a document type...</option>
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Field (Derived Read-Only) */}
          <div className="form-group">
            <label htmlFor="upload-doc-category" className="form-label">
              Category <span className="text-muted">(Derived)</span>
            </label>
            <input
              id="upload-doc-category"
              type="text"
              className="form-input form-input-readonly"
              value={
                derivedCategory ? derivedCategory : "Derived from document type"
              }
              readOnly
              disabled
              aria-describedby="category-description"
            />
            <span id="category-description" className="form-help-text">
              Category is automatically determined by the selected document
              type.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions upload-modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid}
            >
              {isUploading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
