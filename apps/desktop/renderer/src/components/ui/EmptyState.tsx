import React, { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  badgeText?: string;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon = "📁",
  badgeText,
  action,
}: EmptyStateProps): React.ReactElement {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      {badgeText && <span className="badge badge-warning">{badgeText}</span>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && <div style={{ marginTop: "0.5rem" }}>{action}</div>}
    </div>
  );
}
