import type { ReactElement } from "react";

export interface DocumentPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function DocumentPagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled = false,
}: DocumentPaginationProps): ReactElement | null {
  if (total === 0) {
    return null;
  }

  const isPreviousDisabled = disabled || page <= 1;
  const isNextDisabled = disabled || page >= totalPages;

  const pageInfo = `Page ${page} of ${Math.max(totalPages, 1)} (${total} ${total === 1 ? "document" : "documents"})`;

  return (
    <nav
      className="documents-pagination"
      role="navigation"
      aria-label="Documents Pagination"
    >
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={isPreviousDisabled}
        aria-label="Previous Page"
      >
        ← Previous
      </button>

      <span className="documents-pagination-info">{pageInfo}</span>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={isNextDisabled}
        aria-label="Next Page"
      >
        Next →
      </button>
    </nav>
  );
}
