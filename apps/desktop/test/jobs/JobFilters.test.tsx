import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  JobFilters,
  JobFiltersProps,
} from "../../renderer/src/components/jobs/JobFilters";

describe("JobFilters Component", () => {
  const defaultProps: JobFiltersProps = {
    filters: {
      company_name: "Google",
      job_title: "Staff",
      status: "INTERESTED",
    },
    sort: {
      sortBy: "created_at",
      sortOrder: "desc",
    },
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    onClear: vi.fn(),
    isFiltered: true,
    disabled: false,
  };

  it("1. renders company, job title, status, and sort inputs with associated labels", () => {
    const html = renderToString(<JobFilters {...defaultProps} />);

    // Labels and ids
    expect(html).toContain('for="job-filter-company"');
    expect(html).toContain('id="job-filter-company"');
    expect(html).toContain('value="Google"');

    expect(html).toContain('for="job-filter-title"');
    expect(html).toContain('id="job-filter-title"');
    expect(html).toContain('value="Staff"');

    expect(html).toContain('for="job-filter-status"');
    expect(html).toContain('id="job-filter-status"');

    expect(html).toContain('for="job-filter-sort"');
    expect(html).toContain('id="job-filter-sort"');
  });

  it("2. renders Clear Filters button when isFiltered is true", () => {
    const htmlFiltered = renderToString(
      <JobFilters {...defaultProps} isFiltered={true} />,
    );
    expect(htmlFiltered).toContain("Clear Filters");

    const htmlUnfiltered = renderToString(
      <JobFilters {...defaultProps} isFiltered={false} />,
    );
    expect(htmlUnfiltered).not.toContain("Clear Filters");
  });

  it("3. renders all approved sort options", () => {
    const html = renderToString(<JobFilters {...defaultProps} />);

    expect(html).toContain("Newest Added");
    expect(html).toContain("Recently Updated");
    expect(html).toContain("Company A–Z");
    expect(html).toContain("Job Title A–Z");
    expect(html).toContain("Salary Highest");
  });

  it("4. disabled prop disables all inputs and selects", () => {
    const html = renderToString(
      <JobFilters {...defaultProps} disabled={true} />,
    );

    // Count occurrences of disabled attribute
    const disabledMatches = html.match(/disabled/g);
    expect(disabledMatches && disabledMatches.length >= 4).toBe(true);
  });
});
