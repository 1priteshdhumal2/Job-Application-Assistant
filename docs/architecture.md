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
3. **Phase 2C-1 Canonical Domain Model (14 Tables)**:
   - **Master Profile Tables**: `profile_personal`, `experiences`, `education`, `skills`, `certifications`, `languages`, `profile_links`, `profile_preferences`.
   - **Document Metadata**: `documents` (pointing to `user-documents` storage paths, versioned, zero file bytes in DB).
   - **Reference Catalog**: `portals` (global read-only reference data seeded with 7 portals).
   - **Job Tracking**: `jobs` (user-scoped job opportunities).
   - **Applications**: `applications` (user-scoped application records linked to jobs and documents).
   - **Answer Bank & Historical Snapshots**: `answer_bank` (canonical user defaults) and `application_answers` (immutable submitted question-answer snapshots).
4. **Database-Level Composite Tenant Integrity**:
   - `applications (job_id, user_id)` -> `jobs (id, user_id)`
   - `applications (resume_document_id, user_id)` -> `documents (id, user_id)`
   - `applications (cover_letter_document_id, user_id)` -> `documents (id, user_id)`
   - `application_answers (application_id, user_id)` -> `applications (id, user_id)`
