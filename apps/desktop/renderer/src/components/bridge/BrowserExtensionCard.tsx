import React, { useState, useEffect, useCallback } from "react";
import type { DesktopBridgeInfo } from "@jobpilot/types";

export function BrowserExtensionCard(): React.ReactElement {
  const [bridgeInfo, setBridgeInfo] = useState<DesktopBridgeInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchBridgeInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window === "undefined" || !window.jobPilot?.getBridgeInfo) {
        throw new Error("Bridge API is not available in this environment.");
      }
      const info = await window.jobPilot.getBridgeInfo();
      if (!info) {
        setError("Browser bridge is unavailable.");
      } else {
        setBridgeInfo(info);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Browser bridge is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBridgeInfo();
  }, [fetchBridgeInfo]);

  const handleCopyCode = async () => {
    if (!bridgeInfo?.pairingCode) return;
    try {
      await navigator.clipboard.writeText(bridgeInfo.pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  return (
    <div
      className="card bridge-extension-card"
      style={{ gridColumn: "1 / -1" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h2 className="card-title" style={{ marginBottom: "0.25rem" }}>
            <span>⚡ Browser Extension Connection</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              lineHeight: 1.4,
            }}
          >
            Pair your Chrome or Edge extension to automatically detect jobs and
            assist your applications.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchBridgeInfo}
          disabled={loading}
          className="btn btn-secondary"
          style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
          title="Refresh pairing info"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {loading && !bridgeInfo && (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            padding: "0.5rem 0",
          }}
        >
          Checking local bridge status...
        </div>
      )}

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {bridgeInfo && !error && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            marginTop: "0.5rem",
            background: "rgba(0, 0, 0, 0.25)",
            padding: "0.875rem 1rem",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.25rem",
              }}
            >
              One-Time Pairing Code
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                data-testid="pairing-code"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "var(--accent-cyan)",
                  background: "rgba(6, 182, 212, 0.12)",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "4px",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                }}
              >
                {bridgeInfo.pairingCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Bridge: </strong>
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                http://{bridgeInfo.host}:{bridgeInfo.port}
              </code>
            </div>
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
              }}
            >
              Open extension popup → paste code → click{" "}
              <em>Pair with Desktop</em>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
