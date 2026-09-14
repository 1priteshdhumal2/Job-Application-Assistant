import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function CreateJobPage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Add New Job"
        description="Track a new job opportunity and prepare for application."
        breadcrumbs={[{ label: "Jobs", to: "/app/jobs" }, { label: "New Job" }]}
      />

      <EmptyState
        icon="➕"
        title="Create Job Form"
        description="Job creation form and validation will be implemented in Phase 2D-2B-3."
        badgeText="Phase 2D-2B-1 Placeholder"
      />
    </div>
  );
}
