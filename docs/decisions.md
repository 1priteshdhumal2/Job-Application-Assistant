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

---

## ADR 014: Domain Service Layer Architecture & Session Identity Derivation

### Status

Accepted

### Context

The application requires a robust, type-safe data access layer across 14 domain services. Preventing cross-tenant data leakage requires strict session identity derivation without relying on caller-supplied user IDs.

### Decision

1. Every domain service method derives the active user identity via `requireAuthUser(supabase)`, which queries `supabase.auth.getUser()`.
2. Caller-supplied user IDs are prohibited in all domain service parameters.
3. Service queries inject `.eq('user_id', user.id)` as defense-in-depth alongside PostgreSQL Row Level Security (RLS).

### Consequences

- Zero risk of caller identity spoofing.
- Immutable tenant isolation guaranteed at both application and database layers.

---

## ADR 015: Atomic Database-Level Application State Machine

### Status

Accepted

### Context

Application status transitions (SAVED -> INTERESTED -> APPLIED -> ASSESSMENT -> INTERVIEW -> OFFER -> REJECTED / WITHDRAWN) must execute atomically to prevent race conditions during concurrent state updates.

### Decision

Implement the state machine as a PostgreSQL `SECURITY INVOKER` function `public.transition_application_status`.
The function locks the application row using `SELECT ... FOR UPDATE`, validates transitions, updates timestamps (`applied_at`, `submitted_at`), and treats same-status transitions as idempotent no-ops.

### Consequences

- Concurrency-safe status updates executed directly within PostgreSQL transactions.
- Zero risk of race conditions or invalid status mutations.

---

## ADR 016: Application Soft Deletion & Active Record Isolation

### Status

Accepted

### Context

Soft deletion of job applications is required to allow users to archive applications while preserving historical records, linked documents, and immutable answer snapshots.

### Decision

Add `deleted_at TIMESTAMPTZ NULL` to `public.applications`.

1. Standard listing/get functions (`listApplications`, `getApplication`) query `WHERE deleted_at IS NULL`.
2. Dedicated functions (`listDeletedApplications`, `getDeletedApplication`, `restoreApplication`) query `WHERE deleted_at IS NOT NULL`.
3. Soft-deleted applications cannot be updated, transitioned, or receive new answer snapshots.

### Consequences

- Clean separation between active work and deleted archives without data loss.
- Invariants strictly maintained for deleted applications.

---

## ADR 017: Document Logical Group Identity, Versioning & Storage Compensation

### Status

Accepted

### Context

Multiple versions of a logical document (e.g., resume revisions) must be grouped together under a common identity while ensuring that exactly one version is active at any time. Storage upload failures must not leave orphan database rows or storage binaries.

### Decision

1. Add `document_group_id UUID NOT NULL` to `public.documents`.
2. Enforce active version uniqueness using partial unique index `uq_documents_group_active ON documents (document_group_id) WHERE is_active = TRUE`.
3. Implement atomic version replacement via PostgreSQL function `public.create_document_version`.
4. Enforce storage compensation: if metadata insertion or RPC fails after binary upload, the service automatically deletes the newly uploaded orphan binary.

### Consequences

- Exactly one active document version per group.
- Storage and database consistency preserved with zero orphaned binaries.

---

## ADR 018: Database-Enforced Immutable Application Answers

### Status

Accepted

### Context

Application answers are historical snapshots submitted for a specific job application. They must be immutable and immune to modification or deletion.

### Decision

1. Revoke `UPDATE` and `DELETE` table privileges on `public.application_answers` from `authenticated` and `anon`.
2. Attach a BEFORE `UPDATE` OR `DELETE` database trigger `trg_prevent_application_answer_mutation` that unconditionally throws a PostgreSQL exception.
3. Expose only `createApplicationAnswer`, `listApplicationAnswers`, and `getApplicationAnswer` in the service layer.

### Consequences

- Historical answers are immutable at both table privilege and database trigger levels.
- Complete protection against future service or database mutation errors.

---

## ADR 019: Standard Collection Pagination, Filtering & Sorting

### Status

Accepted

### Context

Domain collections require consistent pagination, filtering, and sorting conventions while distinguishing naturally bounded collections from large paginated datasets.

### Decision

1. Large datasets (`jobs`, `applications`, `documents`, `answer_bank`) use `PaginatedResult<T>` with default page size 20 (max 100).
2. Naturally bounded collections (`experiences`, `education`, `skills`, `certifications`, `languages`, `profile_links`, `portals`, `application_answers`) return arrays.
3. Sorting enforces static field allowlists per service to prevent SQL injection or unindexed column sorting.

### Consequences

- Standardized, predictable API responses across all 14 services.
- Protection against sorting on invalid or arbitrary columns.

---

## ADR 020: Job Deletion Restrict Invariant & Historical Application Preservation

### Status

Accepted

### Context

Deleting a Job opportunity must never destroy associated job applications, linked document references, or immutable application answer snapshots. Previously, foreign key cascading deletion allowed a job deletion to cascade into applications and attempt deleting immutable application answers.

### Decision

1. Migration `00007_job_deletion_restrict_fk.sql` replaces `ON DELETE CASCADE` with `ON DELETE RESTRICT` on foreign key `fk_applications_job_user`.
2. Jobs with 0 applications may be physically deleted.
3. Jobs with 1 or more applications cannot be physically deleted; PostgreSQL engine rejects deletion with foreign key restriction code `23503`.
4. `deleteJob()` maps error code `23503` to `ConflictError("Job cannot be deleted because applications exist for this job")`.
5. `00006_create_test_auth_users.sql` remains preserved as an applied remote migration to prevent migration history drift, while future test account provisioning is moved to dedicated test setup helpers.

### Consequences

- Database engine enforcement guarantees job deletion cannot destroy application history.
- Historical application answers and document linkages remain 100% intact.
