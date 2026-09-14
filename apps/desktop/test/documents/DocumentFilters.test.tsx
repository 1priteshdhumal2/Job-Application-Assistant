import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  DocumentFilters,
  DocumentFiltersProps,
} from "../../renderer/src/components/documents/DocumentFilters";

describe("DocumentFilters Component", () => {
  const defaultProps: DocumentFiltersProps = {
    filters: {
      name: "Resume_2026",
      document_type: "RESUME",
      category: "resumes",
    },
    onFilterChange: vi.fn(),
    onClear: vi.fn(),
    isFiltered: true,
    disabled: false,
  };

  it("1. renders search input, document type, and category selects with accessible labels", () => {
    const html = renderToString(<DocumentFilters {...defaultProps} />);

    expect(html).toContain('for="document-search-name"');
    expect(html).toContain('id="document-search-name"');
    expect(html).toContain('value="Resume_2026"');

    expect(html).toContain('for="document-filter-type"');
    expect(html).toContain('id="document-filter-type"');

    expect(html).toContain('for="document-filter-category"');
    expect(html).toContain('id="document-filter-category"');
  });

  it("2. renders Clear Filters button when isFiltered is true", () => {
    const htmlFiltered = renderToString(
      <DocumentFilters {...defaultProps} isFiltered={true} />,
    );
    expect(htmlFiltered).toContain("Clear Filters");

    const htmlUnfiltered = renderToString(
      <DocumentFilters {...defaultProps} isFiltered={false} />,
    );
    expect(htmlUnfiltered).not.toContain("Clear Filters");
  });

  it("3. renders all canonical document types and categories", () => {
    const html = renderToString(<DocumentFilters {...defaultProps} />);

    expect(html).toContain("Resume");
    expect(html).toContain("Cover Letter");
    expect(html).toContain("Certificate");
    expect(html).toContain("Portfolio");
    expect(html).toContain("Other");

    expect(html).toContain("Resumes");
    expect(html).toContain("Cover Letters");
    expect(html).toContain("Certificates");
  });

  it("4. disabled prop disables all inputs and selects", () => {
    const html = renderToString(
      <DocumentFilters {...defaultProps} disabled={true} />,
    );

    const disabledMatches = html.match(/disabled/g);
    expect(disabledMatches && disabledMatches.length >= 3).toBe(true);
  });
});
