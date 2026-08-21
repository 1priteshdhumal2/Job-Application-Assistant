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

---

## ADR 010: JobPilot Canonical Domain Model & Entity Segregation

### Status

Accepted

### Context

The application needs to support structured professional profiles, job opportunities, applications, documents, canonical answer banks, and application-specific submitted answers without turning `profiles` into an unwieldy, monolithic table.

### Decision

Establish 14 dedicated domain tables:

1. `profile_personal` (1-to-1 personal details)
2. `experiences` (work history)
3. `education` (degrees & institutions)
4. `skills` (skills with case-insensitive uniqueness)
5. `certifications` (credentials & verification links)
6. `languages` (languages with case-insensitive uniqueness)
7. `profile_links` (professional URLs)
8. `profile_preferences` (search criteria & salary expectations)
9. `documents` (file metadata pointing to `user-documents` bucket)
10. `portals` (global catalog of job portals)
11. `jobs` (user-scoped job postings)
12. `applications` (user-scoped applications linking jobs & documents)
13. `answer_bank` (canonical user answer repository)
14. `application_answers` (historical question-answer snapshots)

### Consequences

- Clean normalization, high query performance, and modular feature evolution.
- Minimal `profiles` identity table remains lightweight and performant.

---

## ADR 011: Application Question-Answer Snapshot Immutability

### Status

Accepted

### Context

Users modify their profile details (e.g., notice period, expected salary, current designation) over time. If historical job applications directly reference mutable profile or answer bank fields, past job applications would silently change their historical submission values.

### Decision

`application_answers` stores a point-in-time snapshot of the question and answer submitted for an application (`question_text`, `answer_value`, `source_type`, `answer_type`). Future modifications to the user's master profile or `answer_bank` will never alter past application answers.

### Consequences

- Full historical integrity and auditability of submitted job applications.
- Clear separation between canonical defaults (`answer_bank`) and application submissions (`application_answers`).

---

## ADR 012: Database-Level Composite Foreign Key Cross-Tenant Isolation

### Status

Accepted

### Context

Relying exclusively on Row Level Security (RLS) or frontend validation to ensure that an application references the user's own job or documents creates vulnerability to subtle logic errors or misconfigured queries.

### Decision

Enforce tenant isolation directly at the database schema level using composite unique keys and composite foreign keys:

- `applications (job_id, user_id)` references `jobs (id, user_id) ON DELETE CASCADE`.
- `applications (resume_document_id, user_id)` references `documents (id, user_id) ON DELETE SET NULL`.
- `applications (cover_letter_document_id, user_id)` references `documents (id, user_id) ON DELETE SET NULL`.
- `application_answers (application_id, user_id)` references `applications (id, user_id) ON DELETE CASCADE`.

### Consequences

- Impossible for an application to reference another tenant's job or documents even if an attacker bypasses application-level checks.
- Defense-in-depth: Schema-level relational guarantees coupled with PostgreSQL Row Level Security.

---

## ADR 013: Document Metadata Segregation from Supabase Object Storage

### Status

Accepted

### Context

Binary document files (resumes, cover letters, portfolios) must be securely stored, versioned, and associated with database entities without storing binary blobs inside PostgreSQL tables.

### Decision

1. Binary files are stored exclusively in the private Supabase Storage bucket `user-documents`.
2. `public.documents` stores structured metadata (`document_type`, `category`, `storage_path`, `mime_type`, `file_size`, `version`, `is_active`).
3. Database check constraints enforce that `storage_path` matches the tenant convention `{user_id}/{category}/{filename}`.

### Consequences

- Optimal database performance and lightweight relational queries.
- Zero binary data stored in PostgreSQL rows.
- Strict consistency between metadata and storage objects.
