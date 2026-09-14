import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { DocumentsPage } from "../../renderer/src/pages/documents/DocumentsPage";
import * as useDocumentsListModule from "../../renderer/src/hooks/useDocumentsList";
import type { DocumentRecord } from "@jobpilot/types";

describe("DocumentsPage Component Integration", () => {
  const sampleDoc: DocumentRecord = {
    id: "doc-1",
    user_id: "user-1",
    document_group_id: "grp-1",
    document_type: "RESUME",
    category: "resumes",
    name: "Staff_Engineer_Resume.pdf",
    storage_path: "user-1/resumes/grp-1/v1/Staff_Engineer_Resume.pdf",
    mime_type: "application/pdf",
    file_size: 153600,
    version: 1,
    is_active: true,
    created_at: "2026-09-14T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
  };

  const defaultMockReturn: useDocumentsListModule.UseDocumentsListResult = {
    documents: [sampleDoc],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    filters: {},
    sort: { sortBy: "created_at", sortOrder: "desc" },
    loading: false,
    error: null,
    setFilters: vi.fn(),
    setPage: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function renderPage() {
    return renderToString(
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>,
    );
  }

  it("1. renders initial loading state when loading is true and documents is empty", () => {
    vi.spyOn(useDocumentsListModule, "useDocumentsList").mockReturnValue({
      ...defaultMockReturn,
      documents: [],
      total: 0,
      loading: true,
    });

    const html = renderPage();

    expect(html).toContain("Loading documents...");
    expect(html).toContain("spinner");
  });

  it("2. renders error state with retry button when error is present", () => {
    vi.spyOn(useDocumentsListModule, "useDocumentsList").mockReturnValue({
      ...defaultMockReturn,
      documents: [],
      total: 0,
      error: "Failed to connect to storage",
    });

    const html = renderPage();

    expect(html).toContain("Failed to load documents");
    expect(html).toContain("Failed to connect to storage");
    expect(html).toContain("Try Again");
  });

  it("3. renders unfiltered empty state when total is 0 and no filters active", () => {
    vi.spyOn(useDocumentsListModule, "useDocumentsList").mockReturnValue({
      ...defaultMockReturn,
      documents: [],
      total: 0,
      filters: {},
    });

    const html = renderPage();

    expect(html).toContain("No Documents Found");
    expect(html).toContain(
      "Your active documents will appear here once uploaded.",
    );
  });

  it("4. renders filtered empty state when total is 0 and filters are active", () => {
    vi.spyOn(useDocumentsListModule, "useDocumentsList").mockReturnValue({
      ...defaultMockReturn,
      documents: [],
      total: 0,
      filters: { name: "NonExistentDoc" },
    });

    const html = renderPage();

    expect(html).toContain("No Matching Documents");
    expect(html).toContain("No documents match your current filter criteria.");
    expect(html).toContain("Clear Filters");
  });

  it("5. renders document table and pagination on successful fetch", () => {
    vi.spyOn(useDocumentsListModule, "useDocumentsList").mockReturnValue({
      ...defaultMockReturn,
      documents: [sampleDoc],
      total: 1,
    });

    const html = renderPage();

    expect(html).toContain("Staff_Engineer_Resume.pdf");
    expect(html).toContain("Resume");
    expect(html).toContain("Page 1 of 1 (1 document)");
  });

  it("6. renders header with Refresh button", () => {
    vi.spyOn(useDocumentsListModule, "useDocumentsList").mockReturnValue(
      defaultMockReturn,
    );

    const html = renderPage();

    expect(html).toContain("Refresh");
    expect(html).toContain("Manage your resumes and cover letters.");
  });
});
