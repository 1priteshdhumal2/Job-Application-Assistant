import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  JobPagination,
  JobPaginationProps,
} from "../../renderer/src/components/jobs/JobPagination";

describe("JobPagination Component", () => {
  const baseProps: JobPaginationProps = {
    page: 2,
    totalPages: 5,
    total: 95,
    pageSize: 20,
    onPageChange: vi.fn(),
    disabled: false,
  };

  it("1. renders page summary info and accessible navigation controls", () => {
    const html = renderToString(<JobPagination {...baseProps} />);

    expect(html).toContain("Page 2 of 5 (95 jobs)");
    expect(html).toContain("← Previous");
    expect(html).toContain("Next →");
    expect(html).toContain('aria-label="Jobs Pagination Navigation"');
  });

  it("2. disables Previous button on the first page", () => {
    const html = renderToString(<JobPagination {...baseProps} page={1} />);

    // Previous should have disabled attribute
    expect(html).toMatch(/<button[^>]*disabled[^>]*>← Previous<\/button>/);
    // Next should not be disabled
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Next →<\/button>/);
  });

  it("3. disables Next button on the final page", () => {
    const html = renderToString(
      <JobPagination {...baseProps} page={5} totalPages={5} />,
    );

    // Next should have disabled attribute
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Next →<\/button>/);
    // Previous should not be disabled
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>← Previous<\/button>/);
  });

  it("4. disables both Previous and Next when disabled prop is true", () => {
    const html = renderToString(
      <JobPagination {...baseProps} disabled={true} />,
    );

    expect(html).toMatch(/<button[^>]*disabled[^>]*>← Previous<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Next →<\/button>/);
  });

  it("5. hides pagination completely when total is 0", () => {
    const html = renderToString(<JobPagination {...baseProps} total={0} />);
    expect(html).toBe("");
  });

  it("6. renders single-page result with both buttons disabled", () => {
    const html = renderToString(
      <JobPagination
        {...baseProps}
        page={1}
        totalPages={1}
        total={12}
        pageSize={20}
      />,
    );

    expect(html).toContain("Page 1 of 1 (12 jobs)");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>← Previous<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Next →<\/button>/);
  });
});
