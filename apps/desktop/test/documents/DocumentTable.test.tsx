import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  DocumentTable,
  DocumentTableProps,
} from "../../renderer/src/components/documents/DocumentTable";
import type { DocumentRecord } from "@jobpilot/types";

describe("DocumentTable Component", () => {
  const mockDocuments: DocumentRecord[] = [
    {
      id: "doc-uuid-1",
      user_id: "user-secret-1",
      document_group_id: "grp-uuid-1",
      document_type: "RESUME",
      category: "resumes",
      name: "Senior_FullStack_Resume.pdf",
      storage_path:
        "user-secret-1/resumes/grp-uuid-1/v1/Senior_FullStack_Resume.pdf",
      mime_type: "application/pdf",
      file_size: 256000,
      version: 1,
      is_active: true,
      created_at: "2026-09-14T10:00:00.000Z",
      updated_at: "2026-09-14T12:00:00.000Z",
    },
  ];

  const defaultProps: DocumentTableProps = {
    documents: mockDocuments,
  };

  function renderTable(props = defaultProps) {
    return renderToString(
      <MemoryRouter>
        <DocumentTable {...props} />
      </MemoryRouter>,
    );
  }

  it("1. renders semantic table markup with accessible table headers", () => {
    const html = renderTable();

    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain('<th scope="col">Name</th>');
    expect(html).toContain('<th scope="col">Type</th>');
    expect(html).toContain('<th scope="col">Category</th>');
    expect(html).toContain('<th scope="col">Version</th>');
    expect(html).toContain('<th scope="col">Size</th>');
    expect(html).toContain('<th scope="col">Updated</th>');
    expect(html).toContain(
      '<th scope="col" class="documents-table-action-header">Actions</th>',
    );
  });

  it("2. renders document fields accurately (name, type badge, category, version, formatted size)", () => {
    const html = renderTable();

    expect(html).toContain("Senior_FullStack_Resume.pdf");
    expect(html).toContain("Resume");
    expect(html).toContain("resumes");
    expect(html).toMatch(/v(<!-- -->)?1/);
    expect(html).toContain("250.0 KB");
  });

  it("3. renders View action button linking to /app/documents/:documentId", () => {
    const html = renderTable();

    expect(html).toContain('href="/app/documents/doc-uuid-1"');
    expect(html).toContain("View");
    expect(html).toContain(
      'aria-label="View details for Senior_FullStack_Resume.pdf"',
    );
  });

  it("4. does not expose user_id or raw storage_path in rendered markup", () => {
    const html = renderTable();

    expect(html).not.toContain("user-secret-1");
    expect(html).not.toContain("user-secret-1/resumes/grp-uuid-1");
  });
});
