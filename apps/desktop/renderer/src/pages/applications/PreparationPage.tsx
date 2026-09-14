import React from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function PreparationPage(): React.ReactElement {
  const { applicationId } = useParams<{ applicationId: string }>();

  return (
    <div className="page-container">
      <PageHeader
        title="Prepare Application Package"
        description="Configure documents, questionnaire answers, and preparation notes."
        breadcrumbs={[
          { label: "Applications", to: "/app/applications" },
          {
            label: applicationId
              ? `App ${applicationId.slice(0, 8)}...`
              : "Detail",
            to: applicationId
              ? `/app/applications/${applicationId}`
              : undefined,
          },
          { label: "Prepare" },
        ]}
      />

      <EmptyState
        icon="⚡"
        title="Application Preparation Workspace"
        description="Atomic application package preparation with versioned documents and answer bank integration will be wired in Phase 2D."
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
