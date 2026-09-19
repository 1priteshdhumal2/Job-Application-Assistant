import React, { useState, useEffect } from "react";
import type { CapturedJobPayload } from "@jobpilot/types";

export function CapturedJobCard(): React.ReactElement {
  const [capturedJob, setCapturedJob] = useState<CapturedJobPayload | null>(
    null,
  );

  useEffect(() => {
    // 1. Initial fetch from Electron Main
    if (typeof window !== "undefined" && window.jobPilot?.getCapturedJob) {
      window.jobPilot
        .getCapturedJob()
        .then((job) => {
          if (job) setCapturedJob(job);
        })
        .catch(() => {});
    }

    // 2. Subscribe to real-time captured job events
    let unsubscribe: (() => void) | undefined;
    if (typeof window !== "undefined" && window.jobPilot?.onJobCaptured) {
      unsubscribe = window.jobPilot.onJobCaptured((job) => {
        setCapturedJob(job);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

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
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            Captured: {new Date(capturedJob.capturedAt).toLocaleTimeString()}
          </span>
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
