import React, { useState, useEffect } from "react";
import {
  getSupabaseBrowserClient,
  User,
  Session,
  SupabaseClient,
} from "@jobpilot/database";
import type { AuthChangeEvent } from "@supabase/supabase-js";

export function AuthCard(): React.ReactElement {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [configMissing, setConfigMissing] = useState(false);

  useEffect(() => {
    try {
      const envUrl =
        (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env
          ?.VITE_SUPABASE_URL || "";
      const envKey =
        (
          import.meta as unknown as {
            env?: { VITE_SUPABASE_ANON_KEY?: string };
          }
        ).env?.VITE_SUPABASE_ANON_KEY || "";

      if (!envUrl || !envKey) {
        setConfigMissing(true);
        return;
      }

      const client = getSupabaseBrowserClient({
        supabaseUrl: envUrl,
        supabaseAnonKey: envKey,
      });
      setSupabase(client);

      // Get initial session
      client.auth
        .getSession()
        .then(
          ({
            data: { session: initialSession },
          }: {
            data: { session: Session | null };
          }) => {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
          },
        );

      // Subscribe to auth state changes
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange(
        (_event: AuthChangeEvent, currentSession: Session | null) => {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        },
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setConfigMissing(true);
      return;
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg(
          "Registration submitted! Check email or sign in directly.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("Signed in successfully.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setErrorMsg(msg);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setSuccessMsg("Signed out successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (configMissing) {
    return (
      <div className="card">
        <h2 className="card-title">Supabase Authentication</h2>
        <div className="alert alert-error">
          <span>
            ⚠️ Supabase configuration missing. Set{" "}
            <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> in your environment.
          </span>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="card">
        <h2 className="card-title">
          <span>Supabase Authentication</span>
          <span className="badge badge-success">Authenticated</span>
        </h2>
        <div className="status-list">
          <div className="status-item">
            <span className="status-label">User Email</span>
            <span className="code-box">{user.email}</span>
          </div>
          <div className="status-item">
            <span className="status-label">User ID (auth.users.id)</span>
            <span className="code-box">{user.id}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Session Expires</span>
            <span className="code-box">
              {session?.expires_at
                ? new Date(session.expires_at * 1000).toLocaleTimeString()
                : "N/A"}
            </span>
          </div>
        </div>
        <button
          className="btn btn-danger"
          onClick={handleSignOut}
          disabled={loading}
        >
          {loading ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <span>Supabase Authentication</span>
        <span className="badge badge-warning">Signed Out</span>
      </h2>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <form
        onSubmit={handleAuth}
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

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ marginTop: "0.25rem" }}
        >
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
