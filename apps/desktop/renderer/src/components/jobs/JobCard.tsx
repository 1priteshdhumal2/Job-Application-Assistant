import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import type { Job } from "@jobpilot/types";

export interface JobCardProps {
  job: Job;
}

function formatCompensation(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  const curr = currency ? ` ${currency}` : "";

  if (min !== null && max !== null) {
    return `$${min.toLocaleString("en-US")} – $${max.toLocaleString("en-US")}${curr}`;
  }
  if (min !== null) {
    return `From $${min.toLocaleString("en-US")}${curr}`;
  }
  if (max !== null) {
    return `Up to $${max.toLocaleString("en-US")}${curr}`;
  }
  return null;
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "External Link";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "SAVED":
      return "badge-status-saved";
    case "INTERESTED":
      return "badge-status-interested";
    case "APPLIED":
      return "badge-status-applied";
    case "CLOSED":
      return "badge-status-closed";
    default:
      return "badge-status-saved";
  }
}

export function JobCard({ job }: JobCardProps): ReactElement {
  const compensation = formatCompensation(
    job.salary_min,
    job.salary_max,
    job.currency,
  );
  const displayDate = formatDate(job.posted_at || job.captured_at);
  const externalDomain = extractDomain(job.job_url);

  return (
    <div className="card job-card">
      <div className="job-card-header">
        <h3 className="job-card-title">
          <Link to={`/app/jobs/${job.id}`} className="job-card-title-link">
            {job.job_title}
          </Link>
        </h3>
        <span
          className={`badge job-status-badge ${getStatusBadgeClass(job.status)}`}
        >
          {job.status}
        </span>
      </div>

      <div className="job-card-company">{job.company_name}</div>

      <div className="job-card-meta-list">
        {job.location && (
          <span className="job-card-meta-item">{`📍 ${job.location}`}</span>
        )}
        {job.employment_type && (
          <span className="job-card-meta-item">{`⏱️ ${job.employment_type}`}</span>
        )}
        {compensation && (
          <span className="job-card-meta-item">{`💰 ${compensation}`}</span>
        )}
        {externalDomain && (
          <span
            className="job-card-meta-item job-card-domain-item"
            title={job.job_url || ""}
          >
            {`🔗 ${externalDomain}`}
          </span>
        )}
      </div>

      <div className="job-card-footer">
        <span className="job-card-date">
          {displayDate ? `Added ${displayDate}` : ""}
        </span>
        <Link to={`/app/jobs/${job.id}`} className="btn btn-secondary btn-sm">
          View Details →
        </Link>
      </div>
    </div>
  );
}
