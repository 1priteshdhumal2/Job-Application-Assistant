import type { ReactElement } from "react";

export interface JobPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function JobPagination({
  page,
  totalPages,
  total,
  onPageChange,
  disabled = false,
}: JobPaginationProps): ReactElement | null {
  if (total === 0) {
    return null;
  }

  const isPreviousDisabled = disabled || page <= 1;
  const isNextDisabled = disabled || page >= totalPages;

  const pageInfo = `Page ${page} of ${Math.max(totalPages, 1)} (${total} ${total === 1 ? "job" : "jobs"})`;

  return (
    <nav
      className="jobs-pagination"
      role="navigation"
      aria-label="Jobs Pagination Navigation"
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

      <span className="jobs-pagination-info">{pageInfo}</span>

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
