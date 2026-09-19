import React from "react";
import { Link } from "react-router-dom";
import { useCaptureWorkflow } from "../../context/CaptureWorkflowContext";

export function CapturedJobCard(): React.ReactElement {
  const {
    capturedJob,
    persistedResult,
    status: captureStatus,
    error: captureError,
    clearCapturedJob,
  } = useCaptureWorkflow();

  return (
    <div
      className="card captured-job-card"
      style={{
        gridColumn: "1 / -1",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "1.25rem",
        marginTop: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          className="card-title"
          style={{
            fontSize: "1.1rem",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>⚡ Captured Job Context</span>
          {capturedJob && (
            <span
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "0.15rem 0.5rem",
                borderRadius: "9999px",
                fontWeight: 600,
              }}
            >
              {capturedJob.portal}
            </span>
          )}
        </h2>
        {capturedJob && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              Captured: {new Date(capturedJob.capturedAt).toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={clearCapturedJob}
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
              title="Dismiss captured job"
            >
              ✕ Dismiss
            </button>
          </div>
        )}
      </div>

      {!capturedJob ? (
        <div
          data-testid="no-captured-job"
          style={{
            padding: "1rem",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "6px",
            border: "1px dashed var(--border-color)",
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          No job captured yet. Browse to an Indeed job page in Chrome/Edge and
          click{" "}
          <strong style={{ color: "var(--accent-cyan)" }}>
            ⚡ Apply with JobPilot
          </strong>
          .
        </div>
      ) : (
        <div
          data-testid="captured-job-details"
          style={{
            background: "rgba(0, 0, 0, 0.25)",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {/* Persistence status banner */}
          {captureStatus === "persisting" && (
            <div
              data-testid="capture-persisting-status"
              style={{
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                color: "var(--accent-cyan)",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>⏳ Persisting job and application to workspace...</span>
            </div>
          )}

          {captureStatus === "error" && captureError && (
            <div
              data-testid="capture-error-status"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {captureError}
            </div>
          )}

          {captureStatus === "success" && persistedResult && (
            <div
              data-testid="capture-success-status"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#6ee7b7",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                fontSize: "0.85rem",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span>
                  {persistedResult.isNewJob
                    ? "✨ New Job Created"
                    : "🔄 Job Metadata Updated"}
                </span>
                <span>•</span>
                <span>
                  {persistedResult.applicationRestored
                    ? "♻️ Application Restored"
                    : persistedResult.applicationCreated
                      ? "💾 Application Created (SAVED)"
                      : "📋 Application Reused"}
                </span>
              </div>
              <Link
                to={`/app/applications/${persistedResult.application.id}`}
                className="btn btn-primary"
                data-testid="open-application-btn"
                style={{
                  fontSize: "0.8rem",
                  padding: "0.3rem 0.75rem",
                  textDecoration: "none",
                }}
              >
                Open Application →
              </Link>
            </div>
          )}

          <div>
            <div
              data-testid="captured-job-title"
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              {capturedJob.title}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
              }}
            >
              <div>
                🏢{" "}
                <strong data-testid="captured-job-company">
                  {capturedJob.company}
                </strong>
              </div>
              <div>
                📍{" "}
                <span data-testid="captured-job-location">
                  {capturedJob.location}
                </span>
              </div>
              <div>
                🆔 ID:{" "}
                <code
                  data-testid="captured-job-id"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-cyan)",
                  }}
                >
                  {capturedJob.externalJobId}
                </code>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              wordBreak: "break-all",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "0.5rem",
            }}
          >
            <strong>URL: </strong>
            <a
              href={capturedJob.url}
              target="_blank"
              rel="noreferrer"
              data-testid="captured-job-url"
              style={{
                color: "var(--accent-cyan)",
                textDecoration: "underline",
              }}
            >
              {capturedJob.url}
            </a>
          </div>

          {capturedJob.description && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                background: "rgba(0, 0, 0, 0.2)",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                maxHeight: "100px",
                overflowY: "auto",
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.25rem",
                  textTransform: "uppercase",
                }}
              >
                Description Preview
              </div>
              {capturedJob.description.length > 300
                ? `${capturedJob.description.substring(0, 300)}...`
                : capturedJob.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
