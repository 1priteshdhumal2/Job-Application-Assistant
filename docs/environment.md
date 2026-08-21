# Environment Configuration Guide

## Overview

JobPilot separates environment configurations across client (desktop renderer) and backend (API service) contexts.

---

## 1. Environment Variable Template (`.env.example`)

```bash
# ==============================================================================
# JobPilot - Environment Variables Template
# Copy this file to .env and fill in your development values.
# NEVER commit .env or secrets to version control.
# ==============================================================================

# Client / Desktop Environment (Vite prefixed)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3001
VITE_APP_ENV=development

# Server Environment (services/api)
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Optional direct Postgres database connection URL
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# Desktop Process Configuration
DESKTOP_LOG_LEVEL=info
```

---

## 2. Supabase Dashboard Configuration

### Authentication Setup

1. **Email Provider**:
   - In Supabase Dashboard -> **Authentication** -> **Providers** -> **Email**:
   - Enable Email provider.
   - Set **Confirm email** to `ON` (Required for Phase 2B).
2. **Google OAuth Provider**:
   - In Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**:
   - Enable Google provider.
   - Enter **Client ID** and **Client Secret** (from Google Cloud Console).
   - Add Authorized Redirect URI from Supabase Dashboard to Google Cloud Console OAuth configuration:
     `https://<project-ref>.supabase.co/auth/v1/callback`
3. **Redirect URLs**:
   - In **Authentication** -> **URL Configuration**:
   - Site URL: `http://localhost:5173`
   - Additional Redirect URLs: `http://localhost:5173/**`

### Storage Setup

- The migrations in `supabase/migrations/00003_create_storage_bucket_and_policies.sql` create and configure the `user-documents` bucket automatically with 25MB limit and allowed MIME types.
