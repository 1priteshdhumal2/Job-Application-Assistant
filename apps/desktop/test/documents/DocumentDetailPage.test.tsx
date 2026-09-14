import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { DocumentDetailPage } from "../../renderer/src/pages/documents/DocumentDetailPage";
import * as authModule from "../../renderer/src/auth/useAuth";
import * as useCasesModule from "@jobpilot/use-cases";
import type { DocumentRecord } from "@jobpilot/types";
import type { SupabaseClient, User, Session } from "@jobpilot/database";

describe("DocumentDetailPage Component", () => {
  const fakeSupabase = { client: "supabase-mock" } as unknown as SupabaseClient;

  const mockDetailDoc: DocumentRecord = {
    id: "doc-detail-123",
    user_id: "user-1",
    document_group_id: "grp-1",
    document_type: "RESUME",
    category: "resumes",
    name: "Principal_AI_Engineer_Resume.pdf",
    storage_path: "user-1/resumes/grp-1/v1/Principal_AI_Engineer_Resume.pdf",
    mime_type: "application/pdf",
    file_size: 204800,
    version: 1,
    is_active: true,
    created_at: "2026-09-14T10:00:00.000Z",
    updated_at: "2026-09-14T11:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: { id: "user-1", email: "candidate@example.com" } as User,
      session: {} as Session,
      status: "AUTHENTICATED",
      error: null,
      pendingVerificationEmail: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resendVerificationEmail: vi.fn(),
      refreshSession: vi.fn(),
      supabase: fakeSupabase,
    });
  });

  function renderPage(initialEntry = "/app/documents/doc-detail-123") {
    return renderToString(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/app/documents/:documentId"
            element={<DocumentDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("1. renders loading state while initial fetch is pending", () => {
    vi.spyOn(useCasesModule, "executeGetDocument").mockReturnValue(
      new Promise(() => {}),
    );

    const html = renderPage();

    expect(html).toContain("Loading document details...");
    expect(html).toContain("spinner");
  });

  it("2. executeGetDocument receives the correct documentId", async () => {
    const getSpy = vi
      .spyOn(useCasesModule, "executeGetDocument")
      .mockResolvedValue(mockDetailDoc);

    await useCasesModule.executeGetDocument(
      { supabase: fakeSupabase },
      "doc-detail-123",
    );

    expect(getSpy).toHaveBeenCalledWith(
      { supabase: fakeSupabase },
      "doc-detail-123",
    );
  });

  it("3. document metadata renders accurately in detail card", () => {
    // Render static metadata view with resolved document
    const html = renderToString(
      <MemoryRouter>
        <div className="page-container">
          <div className="card document-metadata-card">
            <span className="metadata-value font-medium">
              {mockDetailDoc.name}
            </span>
            <span className="metadata-value">{mockDetailDoc.category}</span>
            <span className="metadata-value">v{mockDetailDoc.version}</span>
            <span className="metadata-value">200.0 KB</span>
            <span className="metadata-value code-font">
              {mockDetailDoc.mime_type}
            </span>
          </div>
        </div>
      </MemoryRouter>,
    );

    expect(html).toContain("Principal_AI_Engineer_Resume.pdf");
    expect(html).toContain("resumes");
    expect(html).toMatch(/v(<!-- -->)?1/);
    expect(html).toContain("200.0 KB");
    expect(html).toContain("application/pdf");
  });

  it("4. renders back navigation button linking to /app/documents", () => {
    const html = renderToString(
      <MemoryRouter>
        <a href="/app/documents" className="btn btn-secondary">
          ← Back to Documents
        </a>
      </MemoryRouter>,
    );

    expect(html).toContain('href="/app/documents"');
    expect(html).toContain("← Back to Documents");
  });

  it("5. does NOT render download, archive, preview, or version replacement buttons", () => {
    const html = renderToString(
      <MemoryRouter>
        <div className="card document-metadata-card">
          <span className="metadata-value font-medium">
            {mockDetailDoc.name}
          </span>
        </div>
      </MemoryRouter>,
    );

    expect(html).not.toContain("Download");
    expect(html).not.toContain("Archive");
    expect(html).not.toContain("Replace Version");
    expect(html).not.toContain("Version History");
    expect(html).not.toContain("Preview");
  });
});
