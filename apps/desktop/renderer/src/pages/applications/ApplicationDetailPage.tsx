import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { getApplication, getJob } from "@jobpilot/database";
import type { Application, Job } from "@jobpilot/types";
import { useAuth } from "../../auth/AuthContext";

export function ApplicationDetailPage(): React.ReactElement {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { supabase, status: authStatus } = useAuth();

  const [application, setApplication] = useState<Application | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setError("No application ID provided");
      setLoading(false);
      return;
    }

    if (!supabase || authStatus !== "AUTHENTICATED") {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      try {
        if (!supabase || !applicationId) return;
        const app = await getApplication(supabase, applicationId);
        if (!isMounted) return;
        setApplication(app);

        if (app.job_id) {
          const jobData = await getJob(supabase, app.job_id);
          if (isMounted) {
            setJob(jobData);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load application details",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase, authStatus, applicationId]);

  if (loading) {
    return <LoadingState message="Loading application details..." />;
  }

  if (error || !application) {
    return (
      <div className="page-container">
        <PageHeader
          title="Application Details"
          breadcrumbs={[
            { label: "Applications", to: "/app/applications" },
            { label: "Detail" },
          ]}
        />
        <ErrorState
          title="Application Not Found"
          message={error || "Could not retrieve the requested application."}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={
          job
            ? `${job.job_title} at ${job.company_name}`
            : `Application ${application.id}`
        }
        description={`Application lifecycle status: ${application.status}`}
        breadcrumbs={[
          { label: "Applications", to: "/app/applications" },
          { label: job ? `${job.company_name}` : application.id },
        ]}
        actions={
          applicationId ? (
            <Link
              to={`/app/applications/${applicationId}/prepare`}
              className="btn btn-secondary"
            >
              Go to Preparation →
            </Link>
          ) : undefined
        }
      />

      <div
        style={{
          display: "grid",
          gap: "1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        {/* Application Overview Card */}
        <div
          className="card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "1.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "1rem",
            }}
          >
            Application Status
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              fontSize: "0.875rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Status:</span>
              <span
                style={{
                  fontWeight: 600,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "9999px",
                  background:
                    application.status === "SAVED"
                      ? "rgba(6, 182, 212, 0.15)"
                      : "rgba(16, 185, 129, 0.15)",
                  color:
                    application.status === "SAVED"
                      ? "var(--accent-cyan)"
                      : "#34d399",
                }}
              >
                {application.status}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                Application ID:
              </span>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                {application.id}
              </code>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Created:</span>
              <span style={{ color: "var(--text-primary)" }}>
                {new Date(application.created_at).toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Updated:</span>
              <span style={{ color: "var(--text-primary)" }}>
                {new Date(application.updated_at).toLocaleString()}
              </span>
            </div>
            {application.applied_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  Applied At:
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  {new Date(application.applied_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Attached Job Details Card */}
        {job && (
          <div
            className="card"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "1rem",
              }}
            >
              Job Details
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                fontSize: "0.875rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Title:</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {job.job_title}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Company:</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {job.company_name}
                </span>
              </div>
              {job.location && (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Location:
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {job.location}
                  </span>
                </div>
              )}
              {job.external_job_id && (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Indeed ID:
                  </span>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      color: "var(--accent-cyan)",
                    }}
                  >
                    {job.external_job_id}
                  </code>
                </div>
              )}
              {job.job_url && (
                <div
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "0.5rem",
                    wordBreak: "break-all",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: "0.25rem",
                    }}
                  >
                    URL:
                  </span>
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "var(--accent-cyan)",
                      textDecoration: "underline",
                      fontSize: "0.8rem",
                    }}
                  >
                    {job.job_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
