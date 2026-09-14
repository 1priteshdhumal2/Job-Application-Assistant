import type { ReactElement } from "react";
import type { DocumentType, UserDocumentCategory } from "@jobpilot/types";
import { DOCUMENT_TYPES } from "@jobpilot/types";
import { USER_DOCUMENT_CATEGORIES } from "@jobpilot/types";
import type { DocumentsListFilterState } from "../../hooks/useDocumentsList";

export interface DocumentFiltersProps {
  filters: DocumentsListFilterState;
  onFilterChange: (
    updater:
      | DocumentsListFilterState
      | ((prev: DocumentsListFilterState) => DocumentsListFilterState),
  ) => void;
  onClear: () => void;
  isFiltered: boolean;
  disabled?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  RESUME: "Resume",
  COVER_LETTER: "Cover Letter",
  CERTIFICATE: "Certificate",
  PORTFOLIO: "Portfolio",
  OTHER: "Other",
};

const CATEGORY_LABELS: Record<UserDocumentCategory, string> = {
  resumes: "Resumes",
  "cover-letters": "Cover Letters",
  certificates: "Certificates",
  portfolio: "Portfolio",
  other: "Other",
};

export function DocumentFilters({
  filters,
  onFilterChange,
  onClear,
  isFiltered,
  disabled = false,
}: DocumentFiltersProps): ReactElement {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterChange((prev) => ({
      ...prev,
      name: value.length > 0 ? value : undefined,
    }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as DocumentType | "";
    onFilterChange((prev) => ({
      ...prev,
      document_type: value.length > 0 ? (value as DocumentType) : undefined,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as UserDocumentCategory | "";
    onFilterChange((prev) => ({
      ...prev,
      category: value.length > 0 ? (value as UserDocumentCategory) : undefined,
    }));
  };

  return (
    <div className="card documents-filter-toolbar">
      <div className="documents-filter-grid">
        <div className="form-group">
          <label htmlFor="document-search-name" className="form-label">
            Search by Name
          </label>
          <input
            id="document-search-name"
            type="search"
            className="input"
            placeholder="Search document name..."
            value={filters.name || ""}
            onChange={handleNameChange}
            disabled={disabled}
            aria-label="Search by document name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="document-filter-type" className="form-label">
            Document Type
          </label>
          <select
            id="document-filter-type"
            className="input"
            value={filters.document_type || ""}
            onChange={handleTypeChange}
            disabled={disabled}
            aria-label="Filter by document type"
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="document-filter-category" className="form-label">
            Category
          </label>
          <select
            id="document-filter-category"
            className="input"
            value={filters.category || ""}
            onChange={handleCategoryChange}
            disabled={disabled}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {USER_DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFiltered && (
        <div className="documents-filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear all active filters"
          >
            ✕ Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
