import type { ReactElement } from "react";
import type { JobStatus, SortParams } from "@jobpilot/types";
import type { JobSortField } from "@jobpilot/database";
import type { JobsListFilterState } from "../../hooks/useJobsList";

export interface JobFiltersProps {
  filters: JobsListFilterState;
  sort: SortParams<JobSortField>;
  onFilterChange: (
    updater:
      | JobsListFilterState
      | ((prev: JobsListFilterState) => JobsListFilterState),
  ) => void;
  onSortChange: (
    updater:
      | SortParams<JobSortField>
      | ((prev: SortParams<JobSortField>) => SortParams<JobSortField>),
  ) => void;
  onClear: () => void;
  isFiltered: boolean;
  disabled?: boolean;
}

const SORT_OPTIONS: Array<{
  value: string;
  label: string;
  sortBy: JobSortField;
  sortOrder: "asc" | "desc";
}> = [
  {
    value: "created_at:desc",
    label: "Newest Added",
    sortBy: "created_at",
    sortOrder: "desc",
  },
  {
    value: "updated_at:desc",
    label: "Recently Updated",
    sortBy: "updated_at",
    sortOrder: "desc",
  },
  {
    value: "company_name:asc",
    label: "Company A–Z",
    sortBy: "company_name",
    sortOrder: "asc",
  },
  {
    value: "job_title:asc",
    label: "Job Title A–Z",
    sortBy: "job_title",
    sortOrder: "asc",
  },
  {
    value: "salary_max:desc",
    label: "Salary Highest",
    sortBy: "salary_max",
    sortOrder: "desc",
  },
];

export function JobFilters({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  onClear,
  isFiltered,
  disabled = false,
}: JobFiltersProps): ReactElement {
  const currentSortValue = `${sort.sortBy}:${sort.sortOrder}`;

  const handleSortSelect = (val: string) => {
    const selected = SORT_OPTIONS.find((opt) => opt.value === val);
    if (selected) {
      onSortChange({
        sortBy: selected.sortBy,
        sortOrder: selected.sortOrder,
      });
    }
  };

  return (
    <div className="card jobs-filter-toolbar">
      <div className="jobs-filter-grid">
        <div className="form-group">
          <label htmlFor="job-filter-company" className="form-label">
            Company
          </label>
          <input
            id="job-filter-company"
            type="text"
            className="form-input"
            placeholder="Search company..."
            value={filters.company_name || ""}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                company_name: e.target.value,
              }))
            }
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="job-filter-title" className="form-label">
            Job Title
          </label>
          <input
            id="job-filter-title"
            type="text"
            className="form-input"
            placeholder="Search job title..."
            value={filters.job_title || ""}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                job_title: e.target.value,
              }))
            }
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="job-filter-status" className="form-label">
            Status
          </label>
          <select
            id="job-filter-status"
            className="form-input"
            value={filters.status || ""}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                status: (e.target.value as JobStatus) || undefined,
              }))
            }
            disabled={disabled}
          >
            <option value="">All Statuses</option>
            <option value="SAVED">Saved</option>
            <option value="INTERESTED">Interested</option>
            <option value="APPLIED">Applied</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="job-filter-sort" className="form-label">
            Sort By
          </label>
          <select
            id="job-filter-sort"
            className="form-input"
            value={currentSortValue}
            onChange={(e) => handleSortSelect(e.target.value)}
            disabled={disabled}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFiltered && (
        <div className="jobs-filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClear}
            disabled={disabled}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
