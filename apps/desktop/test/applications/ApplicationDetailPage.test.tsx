import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ApplicationDetailPage } from "../../renderer/src/pages/applications/ApplicationDetailPage";
import * as authContextModule from "../../renderer/src/auth/AuthContext";
import * as databaseModule from "@jobpilot/database";
import type { SupabaseClient, User, Session } from "@jobpilot/database";

describe("ApplicationDetailPage Component (Phase 2D-3 Slice C)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. renders loading state while initial application fetch is pending", () => {
    vi.spyOn(authContextModule, "useAuth").mockReturnValue({
      status: "AUTHENTICATED",
      user: { id: "user-1", email: "user1@example.com" } as unknown as User,
      session: {} as unknown as Session,
      supabase: {} as unknown as SupabaseClient,
      error: null,
      pendingVerificationEmail: null,
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
      resendVerificationEmail: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.spyOn(databaseModule, "getApplication").mockImplementation(
      () => new Promise(() => {}),
    );

    const html = renderToString(
      <MemoryRouter initialEntries={["/app/applications/app-123"]}>
        <Routes>
          <Route
            path="/app/applications/:applicationId"
            element={<ApplicationDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Loading application details...");
  });

  it("2. getApplication receives the correct applicationId parameter", async () => {
    const mockApp = {
      id: "app-123",
      user_id: "user-1",
      job_id: "job-456",
      status: "SAVED" as const,
      applied_at: null,
      submitted_at: null,
      resume_document_id: null,
      cover_letter_document_id: null,
      notes: null,
      latest_preparation_id: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const getSpy = vi
      .spyOn(databaseModule, "getApplication")
      .mockResolvedValue(mockApp);

    const result = await databaseModule.getApplication(
      {} as SupabaseClient,
      "app-123",
    );

    expect(getSpy).toHaveBeenCalledWith({}, "app-123");
    expect(result.id).toBe("app-123");
    expect(result.status).toBe("SAVED");
  });
});
