import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import {
  uploadCurrentUserDocument,
  listCurrentUserDocuments,
  downloadCurrentUserDocument,
  deleteCurrentUserDocument,
} from "@jobpilot/database";
import {
  UserDocumentCategory,
  USER_DOCUMENT_CATEGORIES,
  UserDocumentMetadata,
} from "@jobpilot/types";
import { validateFileForUpload } from "@jobpilot/validation";

export function StorageVerification(): React.ReactElement {
  const { supabase } = useAuth();
  const [category, setCategory] = useState<UserDocumentCategory>("resumes");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<UserDocumentMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const list = await listCurrentUserDocuments(supabase);
      setDocuments(list);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to list documents",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateFileForUpload({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid file selected");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!supabase || !selectedFile) return;
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await uploadCurrentUserDocument(
        supabase,
        category,
        selectedFile,
        selectedFile.name,
      );
      setSuccessMsg(
        `File "${selectedFile.name}" uploaded to [${category}] successfully!`,
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: UserDocumentMetadata) => {
    if (!supabase) return;
    setActionLoading(doc.storagePath);
    setErrorMsg(null);

    try {
      const blob = await downloadCurrentUserDocument(supabase, doc.storagePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Download failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (doc: UserDocumentMetadata) => {
    if (!supabase) return;
    setActionLoading(doc.storagePath);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteCurrentUserDocument(supabase, doc.storagePath);
      setSuccessMsg(`Document "${doc.name}" deleted successfully.`);
      await loadDocuments();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="card-title">
          <span>Storage Verification</span>
          <span className="badge badge-success">user-documents</span>
        </h2>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Private RLS Bucket
        </span>
      </div>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Upload Form */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.25)",
          padding: "1rem",
          borderRadius: "0.5rem",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "0.75rem",
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="doc-category">
              Category
            </label>
            <select
              id="doc-category"
              className="form-input"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as UserDocumentCategory)
              }
              disabled={uploading}
            >
              {USER_DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-file">
              File (PDF, DOCX, XLSX ≤ 25MB)
            </label>
            <input
              id="doc-file"
              ref={fileInputRef}
              type="file"
              className="form-input"
              accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{ width: "100%" }}
        >
          {uploading ? "Uploading Document..." : "Upload Document"}
        </button>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            My Uploaded Documents
          </span>
          <button
            className="btn btn-secondary"
            onClick={loadDocuments}
            disabled={loading}
            style={{ padding: "0.25rem 0.65rem", fontSize: "0.8rem" }}
          >
            {loading ? "Refreshing..." : "Refresh List"}
          </button>
        </div>

        {documents.length === 0 ? (
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              textAlign: "center",
              padding: "1rem 0",
            }}
          >
            {loading ? "Loading documents..." : "No documents uploaded yet."}
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {documents.map((doc) => (
              <div
                key={doc.storagePath}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.65rem 0.85rem",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      className="badge badge-warning"
                      style={{ fontSize: "0.7rem" }}
                    >
                      {doc.category}
                    </span>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={doc.name}
                    >
                      {doc.name}
                    </span>
                  </div>
                  <span
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    {formatFileSize(doc.size)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDownload(doc)}
                    disabled={actionLoading === doc.storagePath}
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                  >
                    {actionLoading === doc.storagePath ? "..." : "Download"}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(doc)}
                    disabled={actionLoading === doc.storagePath}
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
