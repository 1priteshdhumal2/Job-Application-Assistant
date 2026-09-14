import React from "react";
import { HashRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AppRoutes } from "./routes/AppRoutes";
import { LoadingState } from "./components/ui/LoadingState";
import { ErrorState } from "./components/ui/ErrorState";

function AppContent(): React.ReactElement {
  const { status, error } = useAuth();

  if (status === "INITIALIZING") {
    return <LoadingState fullscreen message="Loading JobPilot workspace..." />;
  }

  if (status === "ERROR") {
    return (
      <div
        className="container"
        style={{ maxWidth: "600px", margin: "4rem auto" }}
      >
        <ErrorState
          title="Configuration Error"
          message={
            error || "An error occurred during authentication initialization."
          }
        />
      </div>
    );
  }

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

export function App(): React.ReactElement {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
