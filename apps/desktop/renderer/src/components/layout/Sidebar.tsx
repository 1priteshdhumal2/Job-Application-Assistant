import React from "react";
import { NavLink } from "react-router-dom";

export function Sidebar(): React.ReactElement {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="logo-badge">JP</div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                letterSpacing: "-0.02em",
              }}
            >
              JobPilot
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Candidate Workspace
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/app"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              📊
            </span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/app/jobs"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              💼
            </span>
            <span>Jobs</span>
          </NavLink>

          <NavLink
            to="/app/applications"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              📝
            </span>
            <span>Applications</span>
          </NavLink>

          <NavLink
            to="/app/documents"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              📄
            </span>
            <span>Documents</span>
          </NavLink>

          <NavLink
            to="/app/profile"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              👤
            </span>
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/app/settings"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon" aria-hidden="true">
              ⚙️
            </span>
            <span>Settings</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">
        <NavLink
          to="/app/diagnostics"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="nav-icon" aria-hidden="true">
            🛠️
          </span>
          <span>Diagnostics</span>
        </NavLink>
      </div>
    </aside>
  );
}
