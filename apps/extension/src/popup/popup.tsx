import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ExtensionBridgeClient } from "../background/bridge-client.js";
import { BridgeHealthResponse, BridgeStatusResponse } from "@jobpilot/types";
import "./popup.css";

const bridgeClient = new ExtensionBridgeClient();

export function PopupApp(): React.ReactElement {
  const [loading, setLoading] = useState<boolean>(true);
  const [health, setHealth] = useState<BridgeHealthResponse | null>(null);
  const [status, setStatus] = useState<BridgeStatusResponse | null>(null);
  const [pairingCode, setPairingCode] = useState<string>("");
  const [pairingLoading, setPairingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkBridgeStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const h = await bridgeClient.checkHealth();
      setHealth(h);

      if (h.authenticated) {
        const s = await bridgeClient.getStatus();
        setStatus(s);
      } else {
        setStatus(null);
      }
    } catch (err: unknown) {
      setHealth(null);
      setStatus(null);
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach JobPilot Desktop on 127.0.0.1:4173",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBridgeStatus();
  }, []);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode.trim()) return;

    setPairingLoading(true);
    setError(null);

    try {
      const res = await bridgeClient.pair(pairingCode.trim());
      if (res.success) {
        setPairingCode("");
        await checkBridgeStatus();
      } else {
        setError(res.error || "Invalid pairing code");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to submit pairing code",
      );
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1 className="popup-title">
          <span>⚡</span> JobPilot Assistant
        </h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="status-card">
        <div className="status-header">
          <span
            className={`status-badge ${
              health?.status === "ok" ? "connected" : "disconnected"
            }`}
          >
            {loading
              ? "Checking..."
              : health
                ? "🟢 Bridge Connected"
                : "🔴 Desktop Offline"}
          </span>
        </div>

        <div className="status-meta">
          {health ? (
            <>
              <div>Host: 127.0.0.1:4173</div>
              <div>Desktop App: v{health.version}</div>
              <div>
                Auth: {health.authenticated ? "✅ Paired" : "⚠️ Needs Pairing"}
              </div>
              {status && <div>Desktop Status: Ready</div>}
            </>
          ) : (
            <div>Please ensure JobPilot Desktop application is running.</div>
          )}
        </div>
      </div>

      {health && !health.authenticated && (
        <form onSubmit={handlePair} className="pairing-form">
          <label
            htmlFor="pairing-input"
            style={{ fontSize: "11px", color: "var(--text-muted)" }}
          >
            Enter Pairing Code from JobPilot Desktop:
          </label>
          <input
            id="pairing-input"
            className="pairing-input"
            type="text"
            placeholder="e.g. A1B2C3D4"
            value={pairingCode}
            onChange={(e) => setPairingCode(e.target.value)}
            disabled={pairingLoading}
            maxLength={16}
          />
          <button
            type="submit"
            className="btn"
            disabled={pairingLoading || !pairingCode.trim()}
          >
            {pairingLoading ? "Pairing..." : "Pair with Desktop"}
          </button>
        </form>
      )}

      <button
        type="button"
        className="btn btn-secondary"
        onClick={checkBridgeStatus}
        disabled={loading}
      >
        {loading ? "Testing..." : "Refresh Connection"}
      </button>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
