import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function JobsPage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Jobs"
        description="Manage the jobs you are interested in."
        actions={
          <button type="button" className="btn btn-primary" disabled>
            + Add Job
          </button>
        }
      />

      <EmptyState
        icon="💼"
        title="No Jobs Tracked Yet"
        description="Job management and tracking will be fully enabled in upcoming Phase 2D milestones."
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
