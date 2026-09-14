import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { JobCard } from "../../renderer/src/components/jobs/JobCard";
import type { Job } from "@jobpilot/types";

describe("JobCard Component", () => {
  const baseJob: Job = {
    id: "job-101",
    user_id: "user-1",
    portal_id: null,
    company_name: "Stripe",
    job_title: "Senior Backend Engineer",
    job_url: "https://stripe.com/jobs/senior-backend",
    location: "San Francisco, CA",
    employment_type: "Full-time",
    description: "Build robust financial infrastructure",
    salary_min: 180000,
    salary_max: 240000,
    currency: "USD",
    posted_at: "2026-09-01T12:00:00.000Z",
    captured_at: "2026-09-01T12:00:00.000Z",
    status: "SAVED",
    created_at: "2026-09-01T12:00:00.000Z",
    updated_at: "2026-09-01T12:00:00.000Z",
  };

  function renderCard(job: Job) {
    return renderToString(
      <MemoryRouter>
        <JobCard job={job} />
      </MemoryRouter>,
    );
  }

  it("1. renders job title, company name, and status badge", () => {
    const html = renderCard(baseJob);

    expect(html).toContain("Senior Backend Engineer");
    expect(html).toContain("Stripe");
    expect(html).toContain("SAVED");
    expect(html).toContain("badge-status-saved");
  });

  it("2. renders optional fields (location, employment type, compensation, domain) when supplied", () => {
    const html = renderCard(baseJob);

    expect(html).toContain("San Francisco, CA");
    expect(html).toContain("Full-time");
    expect(html).toContain("$180,000 – $240,000 USD");
    expect(html).toContain("stripe.com");
  });

  it("3. handles null optional fields gracefully without broken output", () => {
    const minimalJob: Job = {
      ...baseJob,
      job_url: null,
      location: null,
      employment_type: null,
      salary_min: null,
      salary_max: null,
      currency: null,
      posted_at: null,
    };

    const html = renderCard(minimalJob);

    expect(html).toContain("Senior Backend Engineer");
    expect(html).toContain("Stripe");
    expect(html).not.toContain("null");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("N/A");
  });

  it("4. verifies job title and View Details navigate to /app/jobs/:jobId", () => {
    const html = renderCard(baseJob);

    // Title Link
    expect(html).toContain('href="/app/jobs/job-101"');
    // View Details button link
    expect(html).toContain("View Details →");
  });

  it("5. verifies the card root container is not a navigation target", () => {
    const html = renderCard(baseJob);

    // Root element should be div.card.job-card
    expect(html.startsWith('<div class="card job-card"')).toBe(true);
    // Root container must not have onclick or role=button
    expect(html).not.toContain('role="button"');
  });

  it("6. formats compensation correctly for min only, max only, min+max, and neither", () => {
    // Min + Max
    const htmlBoth = renderCard({
      ...baseJob,
      salary_min: 120000,
      salary_max: 160000,
      currency: "EUR",
    });
    expect(htmlBoth).toContain("$120,000 – $160,000 EUR");

    // Min only
    const htmlMin = renderCard({
      ...baseJob,
      salary_min: 150000,
      salary_max: null,
      currency: "USD",
    });
    expect(htmlMin).toContain("From $150,000 USD");

    // Max only
    const htmlMax = renderCard({
      ...baseJob,
      salary_min: null,
      salary_max: 200000,
      currency: "USD",
    });
    expect(htmlMax).toContain("Up to $200,000 USD");

    // Neither
    const htmlNone = renderCard({
      ...baseJob,
      salary_min: null,
      salary_max: null,
    });
    expect(htmlNone).not.toContain("💰");
  });

  it("7. maps status values to distinct styling classes", () => {
    const htmlSaved = renderCard({ ...baseJob, status: "SAVED" });
    expect(htmlSaved).toContain("badge-status-saved");

    const htmlInterested = renderCard({ ...baseJob, status: "INTERESTED" });
    expect(htmlInterested).toContain("badge-status-interested");

    const htmlApplied = renderCard({ ...baseJob, status: "APPLIED" });
    expect(htmlApplied).toContain("badge-status-applied");

    const htmlClosed = renderCard({ ...baseJob, status: "CLOSED" });
    expect(htmlClosed).toContain("badge-status-closed");
  });
});
