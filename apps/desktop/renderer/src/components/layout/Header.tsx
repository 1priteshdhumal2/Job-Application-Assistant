import React from "react";
import { useAuth } from "../../auth/AuthContext";

export function Header(): React.ReactElement {
  const { user, signOut } = useAuth();

  return (
    <header className="top-header">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span className="phase-tag">Phase 2D Workspace</span>
      </div>

      <div className="top-header-user">
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {user?.email}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            void signOut();
          }}
          style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
