import React from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function EditJobPage(): React.ReactElement {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <div className="page-container">
      <PageHeader
        title="Edit Job"
        description={`Edit details for job ${jobId || "posting"}.`}
        breadcrumbs={[
          { label: "Jobs", to: "/app/jobs" },
          {
            label: jobId || "Detail",
            to: jobId ? `/app/jobs/${jobId}` : "/app/jobs",
          },
          { label: "Edit" },
        ]}
      />

      <EmptyState
        icon="✏️"
        title="Edit Job Form"
        description={`Job ${jobId || ""} editing form will be implemented in Phase 2D-2B-4.`}
        badgeText="Phase 2D-2B-1 Placeholder"
      />
    </div>
  );
}
