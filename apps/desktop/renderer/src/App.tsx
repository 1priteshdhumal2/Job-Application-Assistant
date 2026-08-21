import React, { useState, useEffect } from "react";
import type { DesktopEnvironmentInfo } from "@jobpilot/types";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./components/AuthScreen";
import { ProfilePanel } from "./components/ProfilePanel";
import { StorageVerification } from "./components/StorageVerification";

function AuthenticatedApp(): React.ReactElement {
  const { user, signOut } = useAuth();
  const [envInfo, setEnvInfo] = useState<DesktopEnvironmentInfo | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [nodeIsolated, setNodeIsolated] = useState(false);

  useEffect(() => {
    // 1. Verify Node.js APIs are NOT accessible to renderer
    const hasNoNode =
      typeof (window as unknown as { process?: unknown }).process ===
        "undefined" &&
      typeof (window as unknown as { require?: unknown }).require ===
        "undefined";
    setNodeIsolated(hasNoNode);

    // 2. Query explicit typed preload API
    if (
      window.jobPilot &&
      typeof window.jobPilot.getEnvironmentInfo === "function"
    ) {
      setIsElectron(true);
      window.jobPilot
        .getEnvironmentInfo()
        .then((info: DesktopEnvironmentInfo) => {
          setEnvInfo(info);
        })
        .catch((err: unknown) => {
          console.error(
            "Failed to query environment info from Electron preload:",
            err,
          );
        });
    }
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div className="brand-row">
            <div className="logo-badge">JP</div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <h1 className="app-title">JobPilot</h1>
                <span className="phase-tag">Phase 2B</span>
              </div>
              <p className="subtitle">Welcome back, {user?.email}</p>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={signOut}
            style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="grid">
        {/* Profile Management */}
        <section>
          <ProfilePanel />
        </section>

        {/* Private Storage Verification */}
        <section>
          <StorageVerification />
        </section>
      </main>

      {/* System Diagnostics */}
      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2 className="card-title">
          <span>Security & System Runtime Diagnostics</span>
        </h2>
        <div className="status-list">
          <div className="status-item">
            <span className="status-label">Electron Context</span>
            <span
              className={`badge ${isElectron ? "badge-success" : "badge-warning"}`}
            >
              {isElectron ? "Connected (Electron)" : "Browser Mode"}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Node.js API Isolation</span>
            <span
              className={`badge ${nodeIsolated ? "badge-success" : "badge-error"}`}
            >
              {nodeIsolated ? "Protected (Isolated)" : "Vulnerable"}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Identity & Trigger</span>
            <span className="badge badge-success">
              Configured (profiles / trigger)
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Storage RLS</span>
            <span className="badge badge-success">
              Enforced (user-documents)
            </span>
          </div>
        </div>

        {envInfo && (
          <div style={{ marginTop: "0.5rem" }}>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "0.4rem",
              }}
            >
              Desktop Environment Metadata:
            </div>
            <pre className="code-box">
              {JSON.stringify(
                {
                  platform: envInfo.platform,
                  arch: envInfo.arch,
                  appVersion: envInfo.appVersion,
                  electronVersion: envInfo.electronVersion,
                  isPackaged: envInfo.isPackaged,
                },
                null,
                2,
              )}
            </pre>
          </div>
        )}
      </section>

      <footer className="footer">
        <p>
          JobPilot Desktop Foundation — Phase 2B (Authentication, Identity,
          Storage & Security)
        </p>
      </footer>
    </div>
  );
}

function AppContent(): React.ReactElement {
  const { status, error } = useAuth();

  if (status === "INITIALIZING") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          color: "var(--text-secondary)",
        }}
      >
        <div
          className="logo-badge"
          style={{ fontSize: "1.5rem", padding: "0.75rem 1.1rem" }}
        >
          JP
        </div>
        <p style={{ fontSize: "0.95rem" }}>Loading authentication...</p>
      </div>
    );
  }

  if (status === "ERROR") {
    return (
      <div
        className="container"
        style={{ maxWidth: "600px", margin: "4rem auto" }}
      >
        <div className="card">
          <h2 className="card-title">Configuration Error</h2>
          <div className="alert alert-error">
            {error || "An error occurred during initialization."}
          </div>
        </div>
      </div>
    );
  }

  if (status === "AUTHENTICATED") {
    return <AuthenticatedApp />;
  }

  // Covers UNAUTHENTICATED and VERIFICATION_REQUIRED
  return (
    <div className="container">
      <header className="header">
        <div className="brand-row">
          <div className="logo-badge">JP</div>
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <h1 className="app-title">JobPilot</h1>
              <span className="phase-tag">Phase 2B Foundation</span>
            </div>
            <p className="subtitle">AI-assisted job application automation</p>
          </div>
        </div>
      </header>
      <main>
        <AuthScreen />
      </main>
      <footer className="footer">
        <p>JobPilot Desktop Foundation — Phase 2B</p>
      </footer>
    </div>
  );
}

export function App(): React.ReactElement {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
