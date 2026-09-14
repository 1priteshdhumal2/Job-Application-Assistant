import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PublicRoute } from "../components/auth/PublicRoute";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";

import { LoginPage } from "../pages/auth/LoginPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { JobsPage } from "../pages/jobs/JobsPage";
import { CreateJobPage } from "../pages/jobs/CreateJobPage";
import { JobDetailPage } from "../pages/jobs/JobDetailPage";
import { EditJobPage } from "../pages/jobs/EditJobPage";
import { ApplicationsPage } from "../pages/applications/ApplicationsPage";
import { ApplicationDetailPage } from "../pages/applications/ApplicationDetailPage";
import { PreparationPage } from "../pages/applications/PreparationPage";
import { DocumentsPage } from "../pages/documents/DocumentsPage";
import { DocumentDetailPage } from "../pages/documents/DocumentDetailPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { DiagnosticsPage } from "../pages/diagnostics/DiagnosticsPage";

function CatchAllRedirect(): React.ReactElement {
  const { status } = useAuth();

  if (status === "AUTHENTICATED") {
    return <Navigate to="/app" replace />;
  }

  return <Navigate to="/login" replace />;
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      {/* Root path redirect */}
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* Public routes (accessible when unauthenticated, redirects to /app if authenticated) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes (requires authentication, redirects to /login if unauthenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<CreateJobPage />} />
          <Route path="jobs/:jobId" element={<JobDetailPage />} />
          <Route path="jobs/:jobId/edit" element={<EditJobPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route
            path="applications/:applicationId"
            element={<ApplicationDetailPage />}
          />
          <Route
            path="applications/:applicationId/prepare"
            element={<PreparationPage />}
          />
          <Route path="documents" element={<DocumentsPage />} />
          <Route
            path="documents/:documentId"
            element={<DocumentDetailPage />}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="diagnostics" element={<DiagnosticsPage />} />
        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}
