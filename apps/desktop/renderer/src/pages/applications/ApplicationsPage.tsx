import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function ApplicationsPage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Applications"
        description="Track your application lifecycle."
        actions={
          <button type="button" className="btn btn-primary" disabled>
            + New Application
          </button>
        }
      />

      <EmptyState
        icon="📝"
        title="No Applications Recorded"
        description="Application lifecycle tracking and management will be connected in upcoming Phase 2D milestones."
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
