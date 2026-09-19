import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { CapturedJobCard } from "../../renderer/src/components/bridge/CapturedJobCard";
import * as workflowModule from "../../renderer/src/context/CaptureWorkflowContext";
import type { CapturedJobPayload } from "@jobpilot/types";

describe("CapturedJobCard Component (Phase 2D-3 Slice C)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. renders empty state placeholder when no job has been captured yet", () => {
    vi.spyOn(workflowModule, "useCaptureWorkflow").mockReturnValue({
      status: "idle",
      capturedJob: null,
      persistedResult: null,
      error: null,
      clearCapturedJob: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <CapturedJobCard />
      </MemoryRouter>,
    );
    expect(html).toContain("Captured Job Context");
    expect(html).toContain("No job captured yet");
  });

  it("2. displays captured job details and persisting status when persisting", () => {
    const mockJob: CapturedJobPayload = {
      portal: "INDEED",
      externalJobId: "jk_test_123",
      url: "https://www.indeed.com/viewjob?jk=jk_test_123",
      title: "Senior React Engineer",
      company: "Acme Cloud",
      location: "San Francisco, CA",
      description: "Build exceptional desktop and web apps.",
      capturedAt: "2026-09-18T12:00:00.000Z",
    };

    vi.spyOn(workflowModule, "useCaptureWorkflow").mockReturnValue({
      status: "persisting",
      capturedJob: mockJob,
      persistedResult: null,
      error: null,
      clearCapturedJob: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <CapturedJobCard />
      </MemoryRouter>,
    );
    expect(html).toContain("Senior React Engineer");
    expect(html).toContain("Acme Cloud");
    expect(html).toContain("jk_test_123");
    expect(html).toContain("Persisting job and application to workspace...");
  });

  it("3. displays persistence success with Open Application CTA button", () => {
    const mockJob: CapturedJobPayload = {
      portal: "INDEED",
      externalJobId: "jk_test_123",
      url: "https://www.indeed.com/viewjob?jk=jk_test_123",
      title: "Staff Engineer",
      company: "Acme Inc",
      location: "Remote",
      capturedAt: "2026-09-18T12:00:00.000Z",
    };

    vi.spyOn(workflowModule, "useCaptureWorkflow").mockReturnValue({
      status: "success",
      capturedJob: mockJob,
      persistedResult: {
        job: {
          id: "job-100",
          user_id: "user-1",
          portal_id: "portal-1",
          external_job_id: "jk_test_123",
          company_name: "Acme Inc",
          job_title: "Staff Engineer",
          job_url: "https://www.indeed.com/viewjob?jk=jk_test_123",
          location: "Remote",
          employment_type: null,
          description: null,
          salary_min: null,
          salary_max: null,
          currency: null,
          posted_at: null,
          captured_at: "2026-09-18T12:00:00.000Z",
          status: "SAVED",
          created_at: "2026-09-18T12:00:00.000Z",
          updated_at: "2026-09-18T12:00:00.000Z",
        },
        application: {
          id: "app-200",
          user_id: "user-1",
          job_id: "job-100",
          status: "SAVED",
          applied_at: null,
          submitted_at: null,
          resume_document_id: null,
          cover_letter_document_id: null,
          notes: null,
          latest_preparation_id: null,
          deleted_at: null,
          created_at: "2026-09-18T12:00:00.000Z",
          updated_at: "2026-09-18T12:00:00.000Z",
        },
        isNewJob: true,
        applicationCreated: true,
        applicationRestored: false,
      },
      error: null,
      clearCapturedJob: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <CapturedJobCard />
      </MemoryRouter>,
    );
    expect(html).toContain("New Job Created");
    expect(html).toContain("Application Created (SAVED)");
    expect(html).toContain("Open Application →");
    expect(html).toContain('href="/app/applications/app-200"');
  });

  it("4. displays error message when persistence fails", () => {
    const mockJob: CapturedJobPayload = {
      portal: "INDEED",
      externalJobId: "jk_test_123",
      url: "https://www.indeed.com/viewjob?jk=jk_test_123",
      title: "Staff Engineer",
      company: "Acme Inc",
      location: "Remote",
      capturedAt: "2026-09-18T12:00:00.000Z",
    };

    vi.spyOn(workflowModule, "useCaptureWorkflow").mockReturnValue({
      status: "error",
      capturedJob: mockJob,
      persistedResult: null,
      error: "Portal INDEED is currently inactive.",
      clearCapturedJob: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <CapturedJobCard />
      </MemoryRouter>,
    );
    expect(html).toContain("Portal INDEED is currently inactive.");
  });
});
