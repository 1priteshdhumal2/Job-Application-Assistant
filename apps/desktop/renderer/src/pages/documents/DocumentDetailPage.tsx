import { useState, useEffect, type ReactElement } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { DocumentTypeBadge } from "../../components/documents/DocumentTypeBadge";
import { executeGetDocument } from "@jobpilot/use-cases";
import type { DocumentRecord } from "@jobpilot/types";
import { useAuth } from "../../auth/useAuth";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function DocumentDetailPage(): ReactElement {
  const { documentId } = useParams<{ documentId: string }>();
  const { supabase, status: authStatus } = useAuth();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = async () => {
    if (!documentId) {
      setError("Document ID is required.");
      setLoading(false);
      return;
    }

    if (authStatus !== "AUTHENTICATED" || !supabase) {
      if (authStatus === "UNAUTHENTICATED") {
        setError("User must be authenticated to view this document.");
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const doc = await executeGetDocument({ supabase }, documentId);
      setDocument(doc);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load document.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId, supabase, authStatus]);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingState message="Loading document details..." />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="page-container">
        <PageHeader
          title="Document Details"
          description="View document metadata and configuration."
          actions={
            <Link to="/app/documents" className="btn btn-secondary">
              ← Back to Documents
            </Link>
          }
        />
        <ErrorState
          title="Failed to load document"
          message={error || "Document not found."}
          onRetry={fetchDocument}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={document.name}
        description="Document details and version metadata."
        actions={
          <Link to="/app/documents" className="btn btn-secondary">
            ← Back to Documents
          </Link>
        }
      />

      <div className="document-detail-layout">
        <div className="card document-metadata-card">
          <div className="card-header">
            <h2 className="card-title">Document Information</h2>
            <div className="document-metadata-badges">
              <DocumentTypeBadge type={document.document_type} />
              <span className="badge badge-success">Active Version</span>
            </div>
          </div>

          <div className="document-metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">Document Name</span>
              <span className="metadata-value font-medium">
                {document.name}
              </span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">Category</span>
              <span className="metadata-value">{document.category}</span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">Version</span>
              <span className="metadata-value">v{document.version}</span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">File Size</span>
              <span className="metadata-value">
                {formatFileSize(document.file_size)}
              </span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">MIME Type</span>
              <span className="metadata-value code-font">
                {document.mime_type || "application/octet-stream"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">Created At</span>
              <span className="metadata-value">
                {formatDate(document.created_at)}
              </span>
            </div>

            <div className="metadata-item">
              <span className="metadata-label">Last Updated</span>
              <span className="metadata-value">
                {formatDate(document.updated_at || document.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
