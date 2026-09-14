import type { ReactElement } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { DocumentFilters } from "../../components/documents/DocumentFilters";
import { DocumentTable } from "../../components/documents/DocumentTable";
import { DocumentPagination } from "../../components/documents/DocumentPagination";
import { useDocumentsList } from "../../hooks/useDocumentsList";

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

  const isFiltered = Boolean(
    (filters.name && filters.name.trim().length > 0) ||
    filters.document_type ||
    filters.category,
  );

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Documents"
        description="Manage your resumes and cover letters."
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
          </div>
        }
      />

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
    </div>
  );
}
