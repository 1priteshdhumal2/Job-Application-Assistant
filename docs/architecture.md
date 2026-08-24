# JobPilot Architecture

## High-Level System Architecture

JobPilot is an AI-assisted job application automation platform designed as a cross-platform desktop application powered by **Electron**, **React**, **Node.js**, and **Supabase**.

```text
┌─────────────────────────────────────────────────────────────┐
│                      JobPilot Desktop                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               Electron Main Process                   │  │
│  │   - Window management, Lifecycle, System Integration  │  │
│  │   - Strict Security: contextIsolation, sandboxed      │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │ IPC (Strict Typed API)        │
│  ┌──────────────────────────▼────────────────────────────┐  │
│  │               Preload Script (Bridge)                 │  │
│  │   - Exposes window.jobPilot (getAppVersion, etc.)     │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │ Main World Context            │
│  ┌──────────────────────────▼────────────────────────────┐  │
│  │               React 18 Renderer (Vite)                │  │
│  │   - AuthProvider / useAuth (Supabase Auth)            │  │
│  │   - Protected Shell: ProfilePanel, StorageCard        │  │
│  │   - Diagnostics & Security Gating                     │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Cloud Platform                    │
│  - Auth (Email/Password, Google OAuth, Session Management)  │
│  - Database (PostgreSQL):                                   │
│      * auth.users                                           │
│      * public.profiles (RLS: auth.uid() = id)               │
│      * handle_new_user() Trigger (SECURITY DEFINER)         │
│  - Storage (user-documents Bucket):                         │
│      * Private (public = false, max 25MB, PDF/DOCX/XLSX)    │
│      * Folder RLS: (storage.foldername(name))[1] = auth.uid │
└─────────────────────────────────────────────────────────────┘
```

---

## Workspace Directory Structure

```text
Job-Application-Assistant/
├── apps/
│   ├── desktop/              # Active Electron + React desktop application
│   ├── mobile/               # Deferred mobile application (placeholder)
│   └── web/                  # Deferred web portal (placeholder)
├── services/
│   ├── api/                  # Active Node.js Express HTTP service
│   ├── ai/                   # Deferred AI / LLM orchestration (placeholder)
│   ├── browser/              # Deferred Playwright automation (placeholder)
│   └── documents/            # Deferred document parser / OCR (placeholder)
├── packages/
│   ├── types/                # Nominal IDs, Profile, Storage & Auth contracts
│   ├── validation/           # Zod schemas (Env, File, Profile, Path sanitization)
│   ├── database/             # Supabase client factory, Profile & Storage services
│   ├── shared/               # Logger, AppError hierarchy, constants
│   ├── profile-core/         # Deferred (placeholder)
│   ├── job-core/             # Deferred (placeholder)
│   └── application-core/     # Deferred (placeholder)
├── supabase/
│   ├── migrations/           # 00001_create_profiles, 00002_trigger, 00003_storage
│   └── config.toml           # Supabase CLI configuration
└── docs/                     # Architecture, ADRs, flows, security, environments
```

---

## Identity, Storage & Domain Data Boundaries

1. **User Identity (`public.profiles`)**:
   - Primary key directly references `auth.users(id) ON DELETE CASCADE`.
   - Created automatically via database trigger upon user signup.
   - Enforced by Row Level Security: users can only view and update their own record.
2. **Private Document Storage (`user-documents`)**:
   - Private bucket with 25MB file size limit and strict MIME validation (PDF, DOCX, XLSX).
   - Folder isolation enforced via Storage RLS: `{user_id}/{category}/{filename}`.
   - Client functions derive user identity automatically from active session token.
3. **Phase 2C-1 & 2C-2 Canonical Domain Model & Service Layer**:
   - **Master Profile Services**: `profile_personal`, `experiences`, `education`, `skills`, `certifications`, `languages`, `profile_links`, `profile_preferences`.
   - **Document Management**: `documents` service managing `document_group_id`, active version uniqueness via `uq_documents_group_active`, version RPC `create_document_version`, and storage upload compensation.
   - **Reference Catalog**: `portals` (global read-only catalog).
   - **Job Management**: `jobs` (user-scoped job opportunities).
   - **Applications & Atomic State Machine**: `applications` service with soft-deletion (`deleted_at`), restoration (`restoreApplication`), and atomic status transitions via PostgreSQL function `transition_application_status`.
   - **Answer Bank & Immutable Snapshots**: `answer_bank` and `application_answers` (strictly immutable at privilege and database trigger levels; no update/delete methods).
4. **Database-Level Composite Tenant Integrity & Lifecycle Safeguards**:
   - `applications (job_id, user_id)` -> `jobs (id, user_id) ON DELETE RESTRICT` (Job with applications cannot be deleted; preserves application history and immutable answer snapshots)
   - `applications (resume_document_id, user_id)` -> `documents (id, user_id) ON DELETE SET NULL`
   - `applications (cover_letter_document_id, user_id)` -> `documents (id, user_id) ON DELETE SET NULL`
   - `application_answers (application_id, user_id)` -> `applications (id, user_id)`
5. **Phase 2C-2 Service Infrastructure (`packages/database/src/common/`)**:
   - `auth.ts`: Strict session identity derivation (`requireAuthUser()`). Zero caller-supplied user IDs.
   - `pagination.ts`: Clamped pagination envelope (`PaginatedResult<T>`) for jobs, applications, documents, answer bank.
   - `sorting.ts`: Strict allowlist sorting validation.
   - `errors.ts`: Deterministic mapping of PostgreSQL/RPC error codes to typed domain errors.
