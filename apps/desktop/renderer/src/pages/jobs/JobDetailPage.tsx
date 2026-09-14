import { useState, useEffect, type ReactElement } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { executeGetJob, executeDeleteJob } from "@jobpilot/use-cases";
import type { Job } from "@jobpilot/types";
import { useAuth } from "../../auth/useAuth";

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

export function JobDetailPage(): ReactElement {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { supabase, status: authStatus } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError("Invalid job identifier.");
      setLoading(false);
      return;
    }

    if (!supabase || authStatus !== "AUTHENTICATED") {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    executeGetJob({ supabase }, jobId)
      .then((data) => {
        if (isMounted) {
          setJob(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load job details.";
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, supabase, authStatus]);

  const handleDelete = async () => {
    if (!jobId || !supabase || authStatus !== "AUTHENTICATED") {
      setDeleteError("Authentication required to delete job.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await executeDeleteJob({ supabase }, jobId);
      setIsDeleteDialogOpen(false);
      navigate("/app/jobs");
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      if (
        rawMsg.toLowerCase().includes("conflict") ||
        rawMsg.toLowerCase().includes("application") ||
        rawMsg.toLowerCase().includes("foreign key") ||
        rawMsg.toLowerCase().includes("restrict")
      ) {
        setDeleteError(
          "Cannot delete this job because one or more applications are attached to it.",
        );
      } else {
        setDeleteError(
          rawMsg || "Failed to delete job posting. Please try again.",
        );
      }
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="Job Detail"
          breadcrumbs={[
            { label: "Jobs", to: "/app/jobs" },
            { label: "Detail" },
          ]}
        />
        <LoadingState message="Loading job posting..." />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="page-container">
        <PageHeader
          title="Job Not Found"
          breadcrumbs={[
            { label: "Jobs", to: "/app/jobs" },
            { label: "Not Found" },
          ]}
        />
        <ErrorState
          title="Failed to load job"
          message={error || "The requested job posting does not exist."}
          onRetry={() => navigate("/app/jobs")}
        />
      </div>
    );
  }

  const compensation = formatCompensation(
    job.salary_min,
    job.salary_max,
    job.currency,
  );
  const postedDate = formatDate(job.posted_at);
  const capturedDate = formatDate(job.captured_at);
  const externalDomain = extractDomain(job.job_url);

  return (
    <div className="page-container">
      <PageHeader
        title={job.job_title}
        description={job.company_name}
        breadcrumbs={[
          { label: "Jobs", to: "/app/jobs" },
          { label: job.job_title },
        ]}
        actions={
          <div className="btn-group">
            <Link to="/app/jobs" className="btn btn-secondary btn-sm">
              ← Back to Jobs
            </Link>
            <Link
              to={`/app/jobs/${job.id}/edit`}
              className="btn btn-secondary btn-sm"
            >
              ✏️ Edit Job
            </Link>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                setDeleteError(null);
                setIsDeleteDialogOpen(true);
              }}
              disabled={isDeleting}
            >
              🗑️ Delete Job
            </button>
          </div>
        }
      />

      {deleteError && (
        <div className="alert alert-error" role="alert">
          {deleteError}
        </div>
      )}

      {/* Main Job Overview Card */}
      <div className="card job-detail-card">
        <div className="job-detail-header">
          <div>
            <div className="job-detail-company">{job.company_name}</div>
            <h2 className="job-detail-title">{job.job_title}</h2>
          </div>
          <span
            className={`badge job-status-badge ${getStatusBadgeClass(job.status)}`}
          >
            {job.status}
          </span>
        </div>

        <div className="job-card-meta-list" style={{ marginTop: "0.5rem" }}>
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

        <div className="job-detail-timestamps">
          {postedDate && (
            <span className="job-detail-timestamp">{`Posted: ${postedDate}`}</span>
          )}
          {capturedDate && (
            <span className="job-detail-timestamp">{`Tracked: ${capturedDate}`}</span>
          )}
        </div>
      </div>

      {/* Description Section */}
      <div className="card form-section">
        <h3 className="form-section-title">Job Description & Details</h3>
        {job.description ? (
          <div className="job-detail-description">{job.description}</div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
            No detailed description provided for this job.
          </p>
        )}
      </div>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Job"
        message="Are you sure you want to permanently delete this job posting? This action cannot be undone."
        confirmText={isDeleting ? "Deleting..." : "Delete Job"}
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
