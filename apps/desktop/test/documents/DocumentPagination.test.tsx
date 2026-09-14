import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  DocumentPagination,
  DocumentPaginationProps,
} from "../../renderer/src/components/documents/DocumentPagination";

describe("DocumentPagination Component", () => {
  const defaultProps: DocumentPaginationProps = {
    page: 1,
    totalPages: 3,
    total: 50,
    pageSize: 20,
    onPageChange: vi.fn(),
    disabled: false,
  };

  it("1. returns null when total is 0", () => {
    const html = renderToString(
      <DocumentPagination {...defaultProps} total={0} />,
    );
    expect(html).toBe("");
  });

  it("2. renders accessible navigation with page info", () => {
    const html = renderToString(<DocumentPagination {...defaultProps} />);

    expect(html).toContain('role="navigation"');
    expect(html).toContain('aria-label="Documents Pagination"');
    expect(html).toContain("Page 1 of 3 (50 documents)");
  });

  it("3. disables Previous button on first page", () => {
    const html = renderToString(
      <DocumentPagination {...defaultProps} page={1} totalPages={3} />,
    );

    expect(html).toContain('disabled="" aria-label="Previous Page"');
    expect(html).not.toContain('disabled="" aria-label="Next Page"');
  });

  it("4. disables Next button on last page", () => {
    const html = renderToString(
      <DocumentPagination {...defaultProps} page={3} totalPages={3} />,
    );

    expect(html).not.toContain('disabled="" aria-label="Previous Page"');
    expect(html).toContain('disabled="" aria-label="Next Page"');
  });
});
