import React, { useState, useEffect } from "react";
import type { DesktopEnvironmentInfo } from "@jobpilot/types";
import { AuthCard } from "./components/AuthCard";

export function App(): React.ReactElement {
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
        <div className="brand-row">
          <div className="logo-badge">JP</div>
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <h1 className="app-title">JobPilot</h1>
              <span className="phase-tag">Phase 2A Foundation</span>
            </div>
            <p className="subtitle">Application foundation is running.</p>
          </div>
        </div>
      </header>

      <main className="grid">
        {/* System & Security Diagnostics */}
        <section className="card">
          <h2 className="card-title">
            <span>Runtime & Security Status</span>
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
              <span className="status-label">Preload Bridge</span>
              <span
                className={`badge ${window.jobPilot ? "badge-success" : "badge-warning"}`}
              >
                {window.jobPilot ? "Explicit (window.jobPilot)" : "Unavailable"}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Backend API Foundation</span>
              <span className="badge badge-success">Configured (/health)</span>
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

        {/* Supabase Authentication Foundation */}
        <section>
          <AuthCard />
        </section>
      </main>

      <footer className="footer">
        <p>
          JobPilot Desktop Foundation — Phase 2A (Secure Monorepo, Electron,
          React, Node.js, Supabase)
        </p>
      </footer>
    </div>
  );
}
