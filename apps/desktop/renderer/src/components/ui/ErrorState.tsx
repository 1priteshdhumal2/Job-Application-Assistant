import React from "react";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps): React.ReactElement {
  return (
    <div className="card" style={{ maxWidth: "600px", margin: "2rem auto" }}>
      <h2 className="card-title" style={{ color: "var(--accent-red)" }}>
        <span>⚠️ {title}</span>
      </h2>
      <div className="alert alert-error">{message}</div>
      {onRetry && (
        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
