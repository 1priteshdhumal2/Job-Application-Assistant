# Architectural Decision Records (ADRs)

This document tracks fundamental architectural and technical decisions made for the **JobPilot** project.

---

## ADR 001: Monorepo Architecture with npm Workspaces

### Status

Accepted

### Context

JobPilot comprises desktop application code (Electron/React), backend services (Node.js API, future AI and browser automation), shared core packages, and infrastructure configuration. Managing these components across disjoint repositories creates synchronization drift, duplicated types, and complicated versioning.

### Decision

Use standard **npm workspaces** with a clean directory hierarchy:

- `apps/*`: User-facing application containers (Desktop, Mobile, Web).
- `services/*`: Autonomous backend services (API, AI Gateway, Browser Automation, Document Processing).
- `packages/*`: Reusable libraries (Types, Validation, Database, Shared Core).

### Consequences

- Zero third-party monorepo tool overhead (e.g. no Turborepo or Nx complexity required initially).
- Single `npm install` bootstraps all workspace dependencies with automatic symlinks.
- Shared domain types and validation contracts are shared across desktop and service runtimes.

---

## ADR 002: Electron Security Model & IPC Isolation

### Status

Accepted

### Context

Desktop applications with web renderers risk Remote Code Execution (RCE) and unauthorized local system access if Node.js APIs or arbitrary IPC channels are accessible to renderer processes, especially given future plans to interact with job portals.

### Decision

Enforce strict Electron security principles from day one:

1. `contextIsolation: true`
2. `nodeIntegration: false`
3. `sandbox: true`
4. `webSecurity: true`
5. Strict Content Security Policy (CSP).
6. Disallow generic IPC primitives (`ipcRenderer.send`, `ipcRenderer.invoke`).
7. Expose only explicit, strongly-typed methods via `contextBridge` on `window.jobPilot`.
8. Intercept `will-navigate` and `setWindowOpenHandler` to block unauthorized navigation or window spawning.

### Consequences

- Renderer has zero direct access to Node.js built-ins (`fs`, `child_process`, `process`, `require`).
- Third-party web content cannot exploit renderer capabilities.

---

## ADR 003: Supabase Client Construction Abstraction

### Status

Accepted

### Context

Scattering `createClient` calls throughout the codebase creates duplicate connections, makes key rotation difficult, and risks accidental leakage of privileged service-role credentials to client bundles.

### Decision

Create `@jobpilot/database` as the sole owner of Supabase client instantiation:

- Provide `createSupabaseBrowserClient` and `getSupabaseBrowserClient` strictly consuming validated client-safe environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Service-role clients are explicitly prohibited in Phase 2A/2B and will never be exposed to the renderer or browser contexts.

### Consequences

- Single, consistent database access layer.
- Enforced boundary preventing privileged keys from entering client bundles.

---

## ADR 004: Runtime Validation with Zod

### Status

Accepted

### Context

TypeScript types exist only at compile time and cannot validate external environment variables, API payloads, or configuration at runtime.

### Decision

Use **Zod** in `@jobpilot/validation` for all runtime validation. Separate environment schemas into:

1. `clientEnvSchema`: Client-safe variables (prefixed with `VITE_`).
2. `serverEnvSchema`: Server-only variables (Node.js API).
3. `desktopConfigSchema`: Desktop main process configurations.
4. `fileValidationSchema` and `profileUpdateSchema`: Strict schema for user-uploaded documents and profile updates.

### Consequences

- Fail-fast initialization if configuration is missing or malformed.
- Single source of truth for runtime validation and static TypeScript inference.

---

## ADR 005: Supabase Hosted PostgreSQL as the Database

### Status

Accepted

### Context

Developers on Windows systems may not have Docker or local PostgreSQL servers installed. Installing and maintaining local database engines creates development environment friction.

### Decision

Use **Supabase PostgreSQL** (cloud-hosted project) as the database backend. Local development does NOT require Docker or a local PostgreSQL instance.

### Consequences

- Zero local Docker or PostgreSQL prerequisites on the developer machine.
- Direct connectivity to Supabase Auth and database via HTTPS/WebSockets.

---

## ADR 006: Delayed Domain Database Schema Implementation

### Status

Accepted

### Context

Phase 2A focused solely on foundation infrastructure (repository, Electron, React, Node.js API health, Supabase Auth setup, tooling). Full domain database schemas (`jobs`, `applications`, `experiences`, `skills`, `ai_runs`, etc.) are deferred to Phase 2C.

### Decision

Defer application domain schema creation to **Phase 2C**. Phase 2B implements ONLY the minimal identity `profiles` table and `user-documents` storage bucket.

### Consequences

- Clean boundaries across roadmap phases.
- Minimal scope creep and high maintainability.

---

## ADR 007: Minimal Profiles Table & Database Trigger Identity Model

### Status

Accepted

### Context

User accounts are managed by Supabase Auth (`auth.users`). In order to attach application profile data (`display_name`, `avatar_url`, `onboarding_status`) without trusting client-side profile creation or creating synchronization race conditions, a deterministic identity link is required.

### Decision

1. Create a minimal `public.profiles` table with `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
2. Attach a PostgreSQL `AFTER INSERT` trigger (`handle_new_user()`) on `auth.users` with `SECURITY DEFINER` and `SET search_path = public` to automatically insert a profile row upon registration.
3. Apply Row Level Security (RLS) on `profiles`:
   - `SELECT`: `auth.uid() = id`
   - `UPDATE`: `auth.uid() = id`
   - `INSERT` / `DELETE`: Denied to normal clients.
4. Services derive identity from `supabase.auth.getUser()`, eliminating caller-provided `userId` parameters.

### Consequences

- Guaranteed 1-to-1 mapping between `auth.users` and `public.profiles`.
- Zero client-side race conditions or spoofed profile insertions.
- Zero raw user IDs passed from renderer components into data access services.

---

## ADR 008: Private Storage Bucket (`user-documents`) & Folder-Based RLS

### Status

Accepted

### Context

JobPilot stores user resumes, cover letters, certificates, and portfolio documents. These documents contain confidential PII and must never be public or accessible across different users.

### Decision

1. Create a private bucket `user-documents` (`public = false`, 25MB limit, PDF/DOCX/XLSX only).
2. Enforce folder-based RLS on `storage.objects` where `(storage.foldername(name))[1] = auth.uid()::text`.
3. Path structure: `user-documents/{authenticated_user_id}/{category}/{unique_sanitized_name}`.
4. Categories restricted to: `resumes`, `cover-letters`, `certificates`, `portfolio`, `other`.
5. Storage service functions (`uploadCurrentUserDocument`, `listCurrentUserDocuments`, `downloadCurrentUserDocument`, `deleteCurrentUserDocument`) strictly validate ownership on the client before request dispatch.

### Consequences

- Full cross-tenant isolation enforced at database/storage RLS level.
- Traversal attempts (`../`, `..\`) and unsupported MIME types are rejected at validation and storage layers.

---

## ADR 009: Strict Email Verification Gating

### Status

Accepted

### Context

Allowing unverified email accounts into the application shell risks phantom accounts, credential abuse, and broken delivery channels.

### Decision

Require email verification (`email_confirmed_at`) for email/password registrations. The application shell gates unverified accounts into a `VERIFICATION_REQUIRED` state with resend capabilities until confirmed. Google OAuth identities are inherently verified by the provider.

### Consequences

- Verified user identity baseline across all authentication methods.
- Clear user guidance and smooth onboarding transitions.
