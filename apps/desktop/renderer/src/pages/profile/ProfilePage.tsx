import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProfilePanel } from "../../components/ProfilePanel";

export function ProfilePage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Profile"
        description="Manage your personal information and candidate preferences."
      />

      <div style={{ maxWidth: "720px" }}>
        <ProfilePanel />
      </div>
    </div>
  );
}
