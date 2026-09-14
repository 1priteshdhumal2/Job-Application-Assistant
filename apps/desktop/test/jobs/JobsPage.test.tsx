import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { JobsPage } from "../../renderer/src/pages/jobs/JobsPage";
import * as useJobsListModule from "../../renderer/src/hooks/useJobsList";
import type { Job } from "@jobpilot/types";

describe("JobsPage Component Integration", () => {
  const sampleJob: Job = {
    id: "job-1",
    user_id: "user-1",
    portal_id: null,
    company_name: "Meta",
    job_title: "Systems Engineer",
    job_url: "https://meta.com/careers/1",
    location: "Menlo Park, CA",
    employment_type: "Full-time",
    description: "Distributed systems engineer",
    salary_min: 190000,
    salary_max: 250000,
    currency: "USD",
    posted_at: "2026-09-01T00:00:00.000Z",
    captured_at: "2026-09-01T00:00:00.000Z",
    status: "INTERESTED",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  const defaultMockReturn: useJobsListModule.UseJobsListResult = {
    jobs: [sampleJob],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    filters: {},
    sort: { sortBy: "created_at", sortOrder: "desc" },
    loading: false,
    error: null,
    setFilters: vi.fn(),
    setSort: vi.fn(),
    setPage: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function renderPage() {
    return renderToString(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>,
    );
  }

  it("1. renders initial loading state when loading is true and jobs is empty", () => {
    vi.spyOn(useJobsListModule, "useJobsList").mockReturnValue({
      ...defaultMockReturn,
      jobs: [],
      total: 0,
      loading: true,
    });

    const html = renderPage();

    expect(html).toContain("Loading jobs...");
    expect(html).toContain("spinner");
  });

  it("2. renders error state with retry button when error is present", () => {
    vi.spyOn(useJobsListModule, "useJobsList").mockReturnValue({
      ...defaultMockReturn,
      jobs: [],
      total: 0,
      error: "Unable to reach database",
    });

    const html = renderPage();

    expect(html).toContain("Failed to load jobs");
    expect(html).toContain("Unable to reach database");
    expect(html).toContain("Try Again");
  });

  it("3. renders unfiltered empty state when total is 0 and no filters active", () => {
    vi.spyOn(useJobsListModule, "useJobsList").mockReturnValue({
      ...defaultMockReturn,
      jobs: [],
      total: 0,
      filters: {},
      sort: { sortBy: "created_at", sortOrder: "desc" },
    });

    const html = renderPage();

    expect(html).toContain("No Jobs Tracked Yet");
    expect(html).toContain("+ Add Your First Job");
    expect(html).toContain('href="/app/jobs/new"');
  });

  it("4. renders filtered empty state when total is 0 and filters are active", () => {
    vi.spyOn(useJobsListModule, "useJobsList").mockReturnValue({
      ...defaultMockReturn,
      jobs: [],
      total: 0,
      filters: { company_name: "NonExistentCorp" },
    });

    const html = renderPage();

    expect(html).toContain("No Matching Jobs");
    expect(html).toContain("No jobs match your current filter criteria");
    expect(html).toContain("Clear Filters");
  });

  it("5. renders job cards and pagination on successful fetch", () => {
    vi.spyOn(useJobsListModule, "useJobsList").mockReturnValue({
      ...defaultMockReturn,
      jobs: [sampleJob],
      total: 1,
    });

    const html = renderPage();

    expect(html).toContain("Systems Engineer");
    expect(html).toContain("Meta");
    expect(html).toContain("Page 1 of 1 (1 job)");
  });

  it("6. renders header with Refresh button and Add Job navigation link", () => {
    vi.spyOn(useJobsListModule, "useJobsList").mockReturnValue(
      defaultMockReturn,
    );

    const html = renderPage();

    expect(html).toContain("Refresh");
    expect(html).toContain("+ Add Job");
    expect(html).toContain('href="/app/jobs/new"');
  });
});
