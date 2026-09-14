import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";

export function SettingsPage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        description="Manage JobPilot preferences and application defaults."
      />

      <EmptyState
        icon="⚙️"
        title="Settings & Preferences"
        description="Application preferences, notification configurations, and local settings will be enabled here."
        badgeText="Phase 2D-1 Placeholder"
      />
    </div>
  );
}
