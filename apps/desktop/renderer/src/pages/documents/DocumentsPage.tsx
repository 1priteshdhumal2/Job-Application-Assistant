import { useState, type ReactElement } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { DocumentFilters } from "../../components/documents/DocumentFilters";
import { DocumentTable } from "../../components/documents/DocumentTable";
import { DocumentPagination } from "../../components/documents/DocumentPagination";
import { UploadDocumentModal } from "../../components/documents/UploadDocumentModal";
import { useDocumentsList } from "../../hooks/useDocumentsList";
import type { SelectedDocumentFile } from "@jobpilot/types";

export function DocumentsPage(): ReactElement {
  const {
    documents,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    loading,
    error,
    setFilters,
    setPage,
    refresh,
  } = useDocumentsList();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<SelectedDocumentFile | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFiltered = Boolean(
    (filters.name && filters.name.trim().length > 0) ||
    filters.document_type ||
    filters.category,
  );

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleOpenUpload = async () => {
    setSuccessMessage(null);
    if (!window.jobPilot?.selectDocumentFile) {
      console.warn(
        "Native file picker is not available in current environment.",
      );
      return;
    }

    try {
      const result = await window.jobPilot.selectDocumentFile();
      if (!result.canceled && result.file) {
        setSelectedFile(result.file);
        setIsUploadModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to open file picker:", err);
    }
  };

  const handleCloseUpload = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
  };

  const handleUploadSuccess = async () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setSuccessMessage("Document uploaded successfully.");
    await refresh();
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Documents"
        description="Manage your resumes, cover letters, and career documents."
        actions={
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => refresh()}
              disabled={loading}
              title="Refresh document list"
              aria-label="Refresh document list"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenUpload}
              title="Upload a new document"
              aria-label="Upload a new document"
              id="upload-document-button"
            >
              + Upload Document
            </button>
          </div>
        }
      />

      {successMessage && (
        <div
          className="alert alert-success alert-dismissible"
          role="status"
          id="upload-success-alert"
        >
          <span>✅</span>
          <span>{successMessage}</span>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setSuccessMessage(null)}
            aria-label="Close alert"
          >
            ×
          </button>
        </div>
      )}

      <DocumentFilters
        filters={filters}
        onFilterChange={setFilters}
        onClear={handleClearFilters}
        isFiltered={isFiltered}
        disabled={loading && documents.length === 0}
      />

      {error ? (
        <ErrorState
          title="Failed to load documents"
          message={error}
          onRetry={() => refresh()}
        />
      ) : loading && documents.length === 0 ? (
        <LoadingState message="Loading documents..." />
      ) : total === 0 ? (
        isFiltered ? (
          <EmptyState
            icon="🔍"
            title="No Matching Documents"
            description="No documents match your current filter criteria. Try adjusting or clearing your filters."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="📄"
            title="No Documents Found"
            description="Your active documents will appear here once uploaded."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenUpload}
              >
                + Upload Document
              </button>
            }
          />
        )
      ) : (
        <>
          <DocumentTable documents={documents} />

          <DocumentPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            disabled={loading}
          />
        </>
      )}

      {isUploadModalOpen && selectedFile && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          file={selectedFile}
          onClose={handleCloseUpload}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
