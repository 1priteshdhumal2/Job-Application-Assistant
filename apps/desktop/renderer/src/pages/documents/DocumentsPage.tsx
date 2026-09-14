import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function DocumentsPage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Documents"
        description="Manage your resumes and cover letters."
        actions={
          <button type="button" className="btn btn-primary" disabled>
            + Upload Document
          </button>
        }
      />

      <EmptyState
        icon="📄"
        title="Document Management Hub"
        description="Structured document management with version replacement and active selection will be connected in Phase 2D."
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
