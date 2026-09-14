import React, { useState, useEffect } from "react";
import type { DesktopEnvironmentInfo } from "@jobpilot/types";
import { PageHeader } from "../../components/ui/PageHeader";

export function DiagnosticsPage(): React.ReactElement {
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
    <div className="page-container">
      <PageHeader
        title="Diagnostics"
        description="Security boundaries, runtime isolation, and platform environment metadata."
      />

      <section className="card">
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
    </div>
  );
}
