import React from "react";
import { AuthScreen } from "../../components/AuthScreen";

export function LoginPage(): React.ReactElement {
  return (
    <div
      className="container"
      style={{ maxWidth: "540px", margin: "3rem auto" }}
    >
      <header
        className="header"
        style={{ alignItems: "center", textAlign: "center" }}
      >
        <div className="brand-row">
          <div
            className="logo-badge"
            style={{ fontSize: "1.5rem", padding: "0.6rem 1rem" }}
          >
            JP
          </div>
          <div>
            <h1 className="app-title">JobPilot</h1>
            <p className="subtitle">AI-assisted job application automation</p>
          </div>
        </div>
      </header>

      <main>
        <AuthScreen />
      </main>

      <footer className="footer">
        <p>JobPilot Desktop — Phase 2D Foundation</p>
      </footer>
    </div>
  );
}
