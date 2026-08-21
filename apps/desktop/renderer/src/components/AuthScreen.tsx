import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";

export function AuthScreen(): React.ReactElement {
  const {
    status,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resendVerificationEmail,
    refreshSession,
    pendingVerificationEmail,
    error: globalError,
  } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await signUpWithPassword(email, password);
        setSuccessMsg(
          "Registration successful! Please check your email to verify your account.",
        );
      } else {
        await signInWithPassword(email, password);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await resendVerificationEmail(pendingVerificationEmail || email);
      setSuccessMsg("Verification email resent! Please check your inbox.");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      await refreshSession();
    } finally {
      setLoading(false);
    }
  };

  if (status === "VERIFICATION_REQUIRED") {
    return (
      <div className="card" style={{ maxWidth: "480px", margin: "2rem auto" }}>
        <h2 className="card-title">
          <span>Email Verification Required</span>
          <span className="badge badge-warning">Pending</span>
        </h2>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            lineHeight: "1.5",
          }}
        >
          A verification link has been sent to{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {pendingVerificationEmail || "your email"}
          </strong>
          . Please verify your email address to access the JobPilot desktop
          application.
        </p>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={handleCheckVerification}
            disabled={loading}
          >
            {loading ? "Checking Status..." : "I've Verified My Email"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleResendVerification}
            disabled={loading}
          >
            Resend Verification Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "440px", margin: "2rem auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="card-title">
          <span>
            {isRegistering ? "Create Account" : "Welcome to JobPilot"}
          </span>
        </h2>
        <span className="badge badge-warning">Phase 2B</span>
      </div>

      {(errorMsg || globalError) && (
        <div className="alert alert-error">{errorMsg || globalError}</div>
      )}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <form
        onSubmit={handleAuthSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="auth-email">
            Email Address
          </label>
          <input
            id="auth-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="candidate@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete={isRegistering ? "new-password" : "current-password"}
          />
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Processing..." : isRegistering ? "Register" : "Sign In"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
          >
            {isRegistering ? "Switch to Login" : "Create Account"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            margin: "0.5rem 0",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-color)",
            }}
          />
          <span>OR</span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "var(--border-color)",
            }}
          />
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleGoogleAuth}
          disabled={loading}
          style={{ width: "100%" }}
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
