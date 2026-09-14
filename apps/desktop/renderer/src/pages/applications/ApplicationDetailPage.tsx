import React from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function ApplicationDetailPage(): React.ReactElement {
  const { applicationId } = useParams<{ applicationId: string }>();

  return (
    <div className="page-container">
      <PageHeader
        title={`Application: ${applicationId || "Unknown"}`}
        description="Detailed application lifecycle status, history, and actions."
        breadcrumbs={[
          { label: "Applications", to: "/app/applications" },
          { label: applicationId || "Detail" },
        ]}
        actions={
          applicationId ? (
            <Link
              to={`/app/applications/${applicationId}/prepare`}
              className="btn btn-secondary"
            >
              Go to Preparation →
            </Link>
          ) : undefined
        }
      />

      <EmptyState
        icon="📊"
        title="Application Details View"
        description={`Application ID ${applicationId || ""} detail view is established for Phase 2D data wiring.`}
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
