import React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { BrowserExtensionCard } from "../../components/bridge/BrowserExtensionCard";

export function DashboardPage(): React.ReactElement {
  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        description="Your workspace for managing jobs, applications, documents, and preparation."
      />

      <div className="grid">
        <BrowserExtensionCard />

        <div className="card">
          <h2 className="card-title">
            <span>💼 Jobs</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Organize job postings, track job details, and prepare tailored
            application materials.
          </p>
          <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
            <Link
              to="/app/jobs"
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              Explore Jobs →
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">
            <span>📝 Applications</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Track your application lifecycle, prepare atomic application
            packages, and manage statuses.
          </p>
          <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
            <Link
              to="/app/applications"
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              View Applications →
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">
            <span>📄 Documents</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Manage your resumes and cover letters with immutable version history
            and secure storage.
          </p>
          <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
            <Link
              to="/app/documents"
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              Manage Documents →
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">
            <span>👤 Profile</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Update your profile identity and candidate preferences for upcoming
            preparations.
          </p>
          <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
            <Link
              to="/app/profile"
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              View Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
