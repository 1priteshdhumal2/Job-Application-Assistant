import React from "react";

export interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
}

export function LoadingState({
  message = "Loading...",
  fullscreen = false,
}: LoadingStateProps): React.ReactElement {
  if (fullscreen) {
    return (
      <div className="loading-fullscreen" role="status" aria-live="polite">
        <div
          className="logo-badge"
          style={{ fontSize: "1.5rem", padding: "0.75rem 1.1rem" }}
        >
          JP
        </div>
        <div className="spinner" />
        <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p style={{ fontSize: "0.9rem" }}>{message}</p>
    </div>
  );
}
