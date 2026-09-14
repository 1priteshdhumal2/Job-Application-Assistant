import React from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function JobDetailPage(): React.ReactElement {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <div className="page-container">
      <PageHeader
        title={`Job Detail: ${jobId || "Unknown"}`}
        description="Detailed view for the selected job opportunity."
        breadcrumbs={[
          { label: "Jobs", to: "/app/jobs" },
          { label: jobId || "Detail" },
        ]}
      />

      <EmptyState
        icon="🔍"
        title="Job Detail View"
        description={`Job ID ${jobId || ""} detail view is ready for Phase 2D data wiring.`}
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
