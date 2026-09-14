import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { JobCard } from "../../components/jobs/JobCard";
import { JobFilters } from "../../components/jobs/JobFilters";
import { JobPagination } from "../../components/jobs/JobPagination";
import { useJobsList } from "../../hooks/useJobsList";

export function JobsPage(): ReactElement {
  const {
    jobs,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    sort,
    loading,
    error,
    setFilters,
    setSort,
    setPage,
    refresh,
  } = useJobsList();

  const isFiltered = Boolean(
    (filters.company_name && filters.company_name.trim().length > 0) ||
    (filters.job_title && filters.job_title.trim().length > 0) ||
    filters.status ||
    sort.sortBy !== "created_at" ||
    sort.sortOrder !== "desc",
  );

  const handleClearFilters = () => {
    setFilters({});
    setSort({ sortBy: "created_at", sortOrder: "desc" });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Jobs"
        description="Organize job postings, track job details, and prepare application materials."
        actions={
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => refresh()}
              disabled={loading}
              title="Refresh job list"
              aria-label="Refresh job list"
            >
              🔄 Refresh
            </button>
            <Link to="/app/jobs/new" className="btn btn-primary">
              + Add Job
            </Link>
          </div>
        }
      />

      <JobFilters
        filters={filters}
        sort={sort}
        onFilterChange={setFilters}
        onSortChange={setSort}
        onClear={handleClearFilters}
        isFiltered={isFiltered}
        disabled={loading && jobs.length === 0}
      />

      {error ? (
        <ErrorState
          title="Failed to load jobs"
          message={error}
          onRetry={() => refresh()}
        />
      ) : loading && jobs.length === 0 ? (
        <LoadingState message="Loading jobs..." />
      ) : total === 0 ? (
        isFiltered ? (
          <EmptyState
            icon="🔍"
            title="No Matching Jobs"
            description="No jobs match your current filter criteria. Try adjusting or clearing your filters."
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
            icon="💼"
            title="No Jobs Tracked Yet"
            description="Get started by adding your first job opportunity."
            action={
              <Link to="/app/jobs/new" className="btn btn-primary">
                + Add Your First Job
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="jobs-grid">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          <JobPagination
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
