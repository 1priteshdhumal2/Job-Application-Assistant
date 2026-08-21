import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/useAuth";
import { getCurrentProfile, updateCurrentProfile } from "@jobpilot/database";
import { Profile } from "@jobpilot/types";

export function ProfilePanel(): React.ReactElement {
  const { supabase, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getCurrentProfile(supabase);
      setProfile(data);
      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to load profile",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await updateCurrentProfile(supabase, {
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      setProfile(updated);
      setSuccessMsg("Profile updated successfully!");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="card-title">User Profile</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Loading profile data...
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="card-title">
          <span>User Profile</span>
          <span
            className={`badge ${
              profile?.onboarding_status === "ACTIVE"
                ? "badge-success"
                : "badge-warning"
            }`}
          >
            {profile?.onboarding_status || "NOT_STARTED"}
          </span>
        </h2>
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid var(--border-color)",
            }}
            onError={(e) => {
              // Hide image on broken URL
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="status-list">
        <div className="status-item">
          <span className="status-label">Account Email</span>
          <span className="code-box">{user?.email || "N/A"}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Identity Status</span>
          <span className="badge badge-success">Verified (auth.users)</span>
        </div>
      </div>

      <form
        onSubmit={handleSaveProfile}
        style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="profile-name">
            Display Name
          </label>
          <input
            id="profile-name"
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="profile-avatar">
            Avatar URL
          </label>
          <input
            id="profile-avatar"
            type="url"
            className="form-input"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ marginTop: "0.25rem" }}
        >
          {saving ? "Saving..." : "Save Profile Changes"}
        </button>
      </form>
    </div>
  );
}
