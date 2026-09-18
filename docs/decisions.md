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

## ADR 003: Database Isolation & Multi-Tenant Security via Supabase RLS

### Status

Accepted

### Context

JobPilot handles sensitive personal user information (resumes, credentials, cover letters, application answers). Cross-tenant data leakage or unauthenticated mutations present severe security and privacy risks.

### Decision

1. Enable Row Level Security (RLS) across all user tables in `public` schema.
2. Direct all authenticated queries through `auth.uid() = user_id` check policies.
3. Restrict anon role privileges strictly to read-only global references (e.g. `portals`).
4. Enforce tenant isolation directly at the PostgreSQL layer, making service bugs unable to leak data across users.

### Consequences

- Zero reliance on application-layer query filtering alone for security.
- Fully verified via automated cross-tenant integration test suites.

---

## ADR 004: Pure Vanilla CSS & CSS Variables for Design Tokens

### Status

Accepted

### Context

The desktop client requires a sleek, modern, glassmorphic dark UI that is performant, maintainable, and free of unnecessary CSS build complexity.

### Decision

Use pure **Vanilla CSS** organized into clear semantic modules (`tokens.css`, `base.css`, `layout.css`, `components.css`, `glass.css`) with CSS custom properties (variables) representing design tokens. Avoid TailwindCSS in early phases to maximize design precision and minimize build dependencies.

### Consequences

- Fast compile and hot-reload times.
- Transparent, highly inspectable styles with native CSS cascade and variables.

---

## ADR 005: Clean Architecture Domain Model (Entities, DTOs, Mappers)

### Status

Accepted

### Context

Phase 2A requires establishing domain models for Profile, Job, Application, and Portal entities that decouple raw database rows from business logic and presentation layers.

### Decision

1. Database rows are typed strictly in `@jobpilot/types` (e.g., `ProfilePersonalRow`, `JobRow`).
2. Domain entities are defined with rich behavior and immutability guarantees.
3. Pure, bidirectional mapper functions (`toDomain`, `toPersistence`, `toDTO`) translate between layers.
4. Validation is decoupled from persistence and handled via Zod schemas in `@jobpilot/validation`.

### Consequences

- Changes to database schemas do not directly break UI components or domain services.
- Predictable, typed data transformations with runtime validation.

---

## ADR 006: Zod Runtime Schema Validation & Error Transformation

### Status

Accepted

### Context

User inputs across desktop forms, file uploads, and API endpoints require validation before hitting domain models or the database. Raw error structures from validation libraries leak implementation details and degrade UX.

### Decision

1. Centralize all validation rules in `@jobpilot/validation` using Zod.
2. Implement custom validators for specific formats (UUID, ISO 8601 timestamps, semver, file extensions).
3. Standardize error transformation into structured domain error objects (`ValidationError`, `FieldValidationError`).

### Consequences

- Consistent validation error messages across all transports (desktop UI, REST API).
- Safe parsing prevents malicious or malformed payloads from propagating.

---

## ADR 007: Supabase Client Architecture & Auth State Management

### Status

Accepted

### Context

The application needs reliable authentication state management that handles session persistence, token refresh, and lifecycle events across both browser/renderer and Node.js environments.

### Decision

1. Create a singleton Supabase client wrapper in `@jobpilot/database`.
2. Configure automatic token refresh and local storage session persistence for desktop clients.
3. Provide reactive auth state listeners (`onAuthStateChange`) for UI state synchronization.
4. Expose clean authentication abstractions (`signIn`, `signUp`, `signOut`, `getSession`, `getUser`).

### Consequences

- Centralized auth configuration simplifies environment management.
- Transparent session recovery across desktop restarts.

---

## ADR 008: File Storage Strategy & Document Upload Pipeline

### Status

Accepted

### Context

Job applications require uploading and managing resumes, cover letters, and portfolio documents in various formats (PDF, DOCX) with size and type constraints.

### Decision

1. Use Supabase Storage private buckets (`documents`) with RLS policies restricting access to the file owner.
2. Implement file validation pipeline in `@jobpilot/validation` enforcing file type allowlists (PDF, DOCX), magic-byte verification, and size caps (5MB max).
3. Generate secure, short-lived signed URLs for document downloads/previews.
4. Store metadata (file name, MIME type, size, hash, storage path) in `public.documents` table.

### Consequences

- Files are never stored in the database directly.
- Private bucket access guarantees document confidentiality.

---

## ADR 009: Standardized Domain Error Hierarchy

### Status

Accepted

### Context

Error handling across services, IPC channels, and UI components was inconsistent, making error recovery, user notifications, and logging difficult.

### Decision

Define a unified error hierarchy in `@jobpilot/shared`:

- `JobPilotError` (base class)
  - `NotFoundError` (resource does not exist)
  - `ValidationError` (input validation failure)
  - `ConflictError` (unique constraint or state conflict)
  - `AuthError` (unauthenticated or unauthorized)
  - `DatabaseError` (PostgreSQL / storage failure)
  - `InvalidStateTransitionError` (state machine violation)

All errors include machine-readable error codes, HTTP status mappings, and optional structured metadata.

### Consequences

- Predictable error handling at all layers.
- Error codes map cleanly to localized UI error messages.

---

## ADR 010: Job Status State Machine & Atomic Transitions

### Status

Accepted

### Context

Job applications progress through distinct lifecycle stages (`SAVED` -> `INTERESTED` -> `APPLIED` -> `ASSESSMENT` -> `INTERVIEW` -> `OFFER` -> `REJECTED` / `WITHDRAWN`). Invalid transitions (e.g. `REJECTED` -> `APPLIED`) corrupt reporting and workflow automation.

### Decision

1. Implement an explicit state transition graph with allowed transition rules.
2. Validate transitions in both TypeScript domain services and via PostgreSQL stored procedure `transition_application_status`.
3. Auto-populate `applied_at` and `submitted_at` timestamps upon transition to `APPLIED`.
4. Disallow transitions from terminal states (`REJECTED`, `WITHDRAWN`) unless explicitly reopened through an approved path.

### Consequences

- Impossible for applications to enter inconsistent or invalid lifecycle states.
- Auditable status change history.

---

## ADR 011: Document Logical Group Versioning & Active Constraint

### Status

Accepted

### Context

Users frequently upload revisions of resumes and cover letters. We must preserve historical versions while ensuring only one version per document group is marked active for automated application flows.

### Decision

1. Introduce `document_group_id` UUID on `public.documents` to group versions together.
2. Auto-increment `version` integer per `(user_id, document_group_id)`.
3. Use PostgreSQL partial unique index `uq_documents_active_version` on `(user_id, document_group_id) WHERE is_active = true` to enforce at most one active version per group.
4. Provide atomic RPC `create_document_version` that deactivates the previous active version and creates the new version in a single transaction.

### Consequences

- Historical document versions are preserved and immutable.
- Eliminates race conditions in active document selection.

---

## ADR 012: Soft-Delete with Cascade Protection for Applications

### Status

Accepted

### Context

Users may remove applications from their active view, but historical data (applied jobs, answer snapshots, document references) must not be destroyed if referenced by audit logs or reporting.

### Decision

1. Add `deleted_at TIMESTAMPTZ NULL` column to `public.applications`.
2. Standard list queries automatically filter `deleted_at IS NULL`.
3. Provide explicit `softDeleteApplication` and `restoreApplication` service methods.
4. Maintain dedicated endpoints / filters for viewing and restoring archived applications.

### Consequences

- Accidental deletion is non-destructive and immediately recoverable.
- Historical application records remain queryable for analytics.

---

## ADR 013: Answer Bank Normalization & Autofill Resolution Strategy

### Status

Accepted

### Context

Job application forms frequently ask standard questions (e.g., "Years of React experience?", "Willing to relocate?", "Notice period?"). Users need a reusable answer repository that maps concepts to questions across different portals.

### Decision

1. Create `public.answer_bank` table with `concept_key`, `canonical_answer`, `answer_type`, `sensitivity`, and `question_pattern`.
2. Support three sensitivity levels: `NORMAL`, `SENSITIVE` (requires review before submission), `NEVER_AUTOFILL`.
3. Use regex / keyword matching on `question_pattern` during autofill resolution.
4. Record answer snapshot in `public.application_answers` upon preparation/submission for full immutability.

### Consequences

- High autofill accuracy for repetitive job portal questions.
- User retains explicit control over sensitive data auto-submission.

---

## ADR 014: Unified IPC Contract for Desktop-to-Core Communication

### Status

Accepted

### Context

The Electron preload script exposed ad-hoc IPC methods without centralized type safety, risking contract drift between the main process and renderer.

### Decision

1. Define a strongly-typed `JobPilotIpcBridge` interface in `@jobpilot/types`.
2. Implement explicit request/response handlers in `apps/desktop/src/main/ipc/` categorized by domain (`profile`, `jobs`, `applications`, `documents`, `answers`).
3. Standardize response payload format: `{ data?: T; error?: { code: string; message: string; details?: unknown } }`.
4. Validate all IPC inputs with Zod schemas in the main process before invoking domain services.

### Consequences

- Full compile-time type safety across IPC boundaries.
- Main process acts as an untrusted-input firewall protecting domain services.

---

## ADR 015: Fast Vitest Suite with Dual Unit and Remote Integration Tests

### Status

Accepted

### Context

Testing strategy must balance fast local feedback (mocked unit tests) with high-confidence verification against real Supabase infrastructure (RLS policies, triggers, RPCs, storage).

### Decision

1. Use Vitest as the universal test runner across all packages and apps.
2. Unit tests mock external dependencies (`SupabaseClient`, storage) for sub-millisecond execution.
3. Integration tests execute against real remote Supabase instance verifying:
   - RLS tenant isolation across two distinct test users.
   - Database triggers and partial unique indexes.
   - Storage upload, signed URL generation, and cleanup.
   - Stored procedures and atomic transactions.
4. Maintain 100% test pass rate with zero skips in CI/local runs.

### Consequences

- Immediate unit test feedback during development.
- Guaranteed real-world database and security policy verification.

---

## ADR 016: Zero-Warning TypeScript & ESLint Strictness

### Status

Accepted

### Context

Codebase quality and type safety degrade over time without strict compiler and linter enforcement.

### Decision

1. Base `tsconfig.base.json` with `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: false`, `noUncheckedIndexedAccess: true`.
2. Flat ESLint 9 configuration with `@typescript-eslint/recommended` and `eslint-config-prettier`.
3. Zero-warning policy on `npm run lint`, `npm run typecheck`, and `npm run format:check`.

### Consequences

- High code quality baseline with zero lint/type errors tolerated.
- Consistent code formatting across all monorepo workspaces.

---

## ADR 017: Multi-Tenant Data Isolation with RLS & Foreign Key Cascades

### Status

Accepted

### Context

Cross-tenant data safety must be enforced at the schema and RLS level, not purely in application logic.

### Decision

1. Every user-owned table includes `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
2. Composite foreign keys `(job_id, user_id)` and `(application_id, user_id)` guarantee related records belong to the same tenant.
3. Database RLS policies evaluate `auth.uid() = user_id` for all operations.

### Consequences

- Impossible for a user to attach their application to another user's job or document.
- User account deletion cleanly cascades without orphaned records.

---

## ADR 018: Immutable Application Answer Snapshots

### Status

Accepted

### Context

Once an application is prepared or submitted, the answers provided must remain permanently immutable for audit, history, and legal compliance.

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

---

## ADR 021: Repeatable Application Preparation & Immutable Snapshot Entity

### Status

Accepted

### Context

Job applications are frequently iterated, refined, or corrected over time (e.g. customized resume versions, tailored cover letters, updated salary expectations) prior to submission. Storing a single mutable draft state on `public.applications` destroys the historical record of what was prepared. Furthermore, deleting an application record must not erase preparation history.

### Decision

1. Preparation is strictly pre-submission: applications may only be prepared while in `SAVED` or `INTERESTED` status. Once an application reaches `APPLIED` (or terminal/post-submission states `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`), further preparation attempts are strictly rejected (`APPLICATION_STATUS_NOT_PREPARABLE`).
2. No synthetic `PREPARED`, `READY`, or `DRAFT` status exists; preparation produces an immutable snapshot while preserving `SAVED`/`INTERESTED` lifecycle state.
3. Introduce `public.application_preparations` as an immutable snapshot entity tracking:
   - `id`, `user_id`, `job_id`, `application_id`, `original_application_id`
   - `preparation_number` (sequential 1, 2, 3...)
   - `resume_document_id`, `cover_letter_document_id`, `notes`, `status`
   - `idempotency_key`, `payload_hash`, `created_at`
4. `application_preparations.application_id` uses `ON DELETE SET NULL`, while `original_application_id UUID NOT NULL` and `(job_id, user_id)` FKs preserve the historical identity and job linkage permanently even if the application is hard-deleted.
5. Restructure `public.application_answers` to belong directly to a preparation via `preparation_id UUID NOT NULL REFERENCES application_preparations(id, user_id) ON DELETE CASCADE`.
6. Add `applications.latest_preparation_id UUID NULL REFERENCES application_preparations(id, user_id) ON DELETE SET NULL` as a fast pointer to the most recent preparation designated for the next submission attempt.
7. Attach immutability trigger `trg_prevent_application_prep_mutation` on `application_preparations` revoking `UPDATE` and `DELETE`.

### Consequences

- Complete historical auditability: every preparation preserves the exact resume version, cover letter version, answers, notes, and status at that point in time.
- Preparation history permanently survives hard deletion of the parent application.
- Preparation is strictly bounded to the pre-submission phase (`SAVED` and `INTERESTED`), preventing state corruption once an application is submitted.
- Desktop UI integration of Phase 2C-3 domain workflows is deferred to future UI milestones.

---

## ADR 022: Physical Document Version Retention Invariant

### Status

Accepted

### Context

If a user uploads a new resume version, the old version becomes inactive (`is_active = false`). However, if historical application preparations reference the old version, physically deleting that document file would corrupt the historical preparation snapshot.

### Decision

1. Attach foreign keys `fk_app_prep_resume` and `fk_app_prep_cover` with `ON DELETE RESTRICT` from `application_preparations` to `public.documents(id, user_id)`.
2. Inactive document versions can still be logically deactivated and replaced via `replaceDocumentVersion()`.
3. Physical deletion (`DELETE FROM public.documents WHERE id = ...`) is rejected by PostgreSQL (`23503`) if referenced by any preparation snapshot.

### Consequences

- All document versions referenced by historical preparations remain physically retained for reproducible audit trails.
- Logical version replacement and active state management continue to function seamlessly.

---

## ADR 023: PostgreSQL Idempotency & Concurrency Enforcement via `prepare_application` RPC

### Status

Accepted

### Context

Network retries, double-clicks, or concurrent desktop processes could attempt to prepare an application simultaneously, creating duplicate snapshots or corrupting preparation numbers. Application preparation must be strictly atomic and idempotent.

### Decision

1. Implement stored procedure `public.prepare_application` that executes atomically in a single PostgreSQL transaction.
2. Acquire `FOR SHARE` locks on parent job and referenced documents, and `FOR UPDATE` lock on the application record.
3. Enforce idempotency via unique constraint `uq_app_prep_user_idempotency` on `(user_id, idempotency_key)` and payload hash matching:
   - Same `idempotency_key` + same payload hash -> Return existing application (idempotent success, zero duplicate preparation rows).
   - Same `idempotency_key` + different payload hash -> Throw `409 Conflict` (`IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).
4. Catch concurrent unique violations gracefully and return the committed application record.

### Consequences

- Zero duplicate preparations on network retries or concurrent invocations.
- Strict serialization guarantees monotonically increasing `preparation_number` without gaps or collisions.

---

## ADR 024: Dedicated `@jobpilot/use-cases` Business Orchestration Layer

### Status

Accepted

### Context

Application workflows (e.g. preparing an application, status transitions, document version replacement) involve multi-step orchestration, schema validation, session extraction, and business logic. Coupling orchestration directly into transport handlers (Electron IPC, Express REST) causes duplicate logic and transport lock-in.

### Decision

1. Create `@jobpilot/use-cases` as an isolated workspace package between transport adapters and `@jobpilot/database`.
2. Expose transport-agnostic use cases accepting `UseCaseContext { supabase: SupabaseClient }`:
   - `executePrepareApplication`
   - `executeTransitionApplicationStatus`
   - `executeArchiveApplication`
   - `executeRestoreApplication`
   - `executeUploadUserDocument`
   - `executeReplaceDocumentVersion`
3. Restrict browser automation, portal scraping, and AI generation strictly to Phase 3.

### Consequences

- Desktop Electron IPC and REST API services share the exact same orchestration layer with zero code duplication.
- Clean dependency tree: Transports -> Use Cases -> Database -> Types/Validation/Shared.

---

## ADR 025: Document Content Hashing (SHA-256) & Per-User Duplicate Prevention

### Status

Accepted (Phase 2D-2C-3A)

### Context

Users may inadvertently or intentionally attempt to upload identical documents under different filenames, display names, categories, or document types. Performing duplicate detection solely by filename, metadata, or path is fragile and unreliable. True duplicate detection requires evaluating the cryptographic hash of the document binary content.

### Decision

1. Compute standard **SHA-256** hex hashes (64 lowercase hex characters) from the binary content of uploaded documents using standard Web Crypto (`crypto.subtle.digest("SHA-256", buffer)`).
2. Authoritative duplicate uniqueness is strictly scoped **per user**:
   `UNIQUE INDEX uq_documents_user_content_hash ON public.documents (user_id, content_hash) WHERE content_hash IS NOT NULL;`
3. Nullability strategy: `content_hash TEXT NULL` with check constraint `chk_documents_content_hash` ensures legacy rows with `NULL` remain valid while all new and versioned documents enforce valid SHA-256 format and per-user uniqueness.
4. Two-tier duplicate detection:
   - **Upfront Domain Check**: `findDocumentByContentHash` queries the database before initiating storage binary upload, preventing wasted bandwidth and orphan storage objects.
   - **Database Invariant**: Partial unique index on `(user_id, content_hash)` prevents race conditions during concurrent uploads, mapped to user-friendly `ConflictError("A document with identical content already exists in your library")`.
5. Update `public.create_document_version` stored function to accept `p_content_hash TEXT DEFAULT NULL` and insert into version records.

### Consequences

- Strict prevention of duplicate content per user library across all categories, document types, and file names for all newly uploaded and versioned documents.
- Complete tenant isolation: the same file content uploaded by different users is allowed without cross-tenant conflict or data leakage.
- **MVP Migration State & Limitation**: For the fast-tracked MVP, legacy documents created prior to Phase 2D-2C-3A may have `content_hash = NULL`. Legacy documents with NULL content_hash are not detected as duplicates of newly uploaded files until an out-of-band administrative backfill is executed. All subsequent uploads and version replacements compute and enforce SHA-256 hashes unconditionally.

---

## ADR 026: Desktop Document Upload Vertical Slice & Metadata Binding (Phase 2D-2C-3B)

### Status

Accepted (Phase 2D-2C-3B)

### Context

Document upload requires a cohesive user journey bridging the Electron native OS file picker (`selectDocumentFile`), metadata entry and validation, category mapping, cryptographic SHA-256 content verification, private storage upload, atomic Version 1 creation, and seamless list refresh.

### Decision

1. **Native OS Picker Entrypoint**: Use `window.jobPilot.selectDocumentFile()` to safely choose local files via sandboxed IPC without exposing Node fs/path primitives or credentials to the renderer.
2. **Metadata Derivation & Binding**:
   - Initial Document Name is derived by stripping the file extension while preserving dots/underscores in the base name, and remains editable.
   - Document Type is mandatory from a 5-item enumerated set (`Resume`, `Cover Letter`, `Certificate`, `Portfolio`, `Other`) with no default selected.
   - Category is read-only and automatically mapped from the selected Document Type (`resumes`, `cover-letters`, `certificates`, `portfolio`, `other`).
3. **Validation & Size Limits**: Strict 25 MB ceiling (`26,214,400` bytes) and extension validation (`.pdf`, `.docx`, `.xlsx`) enforced both upfront in UI and within `@jobpilot/validation`.
4. **Clean Duplicate Error UX**: Map `ConflictError` to `"A document with identical content already exists in your library."` avoiding database or internal SQL leakages.
5. **Orchestration Boundary**: The renderer invokes `@jobpilot/use-cases` `executeUploadUserDocument`, which enforces authentication, storage upload, storage compensation on database insert failure, and Version 1 (`version = 1`, `is_active = true`, fresh `document_group_id`) persistence.

### Consequences

- Robust, production-grade document upload flow adhering to strict layered architecture (Renderer -> Use Cases -> Database -> Supabase).
- No direct Supabase calls from renderer.
- Zero leftover storage artifacts on insertion failures via automated compensation.

---

## ADR 027: Chrome/Edge Extension Scaffold & Authenticated Desktop Local Bridge (Phase 2D-3 Slice A)

### Status

Accepted (Phase 2D-3 Slice A)

### Context

JobPilot requires a browser extension for Chrome and Edge to detect job portals (starting with Indeed) and communicate with the JobPilot Desktop app. To keep the extension lightweight, secure, and maintainable, the extension must NOT duplicate desktop features (such as resume selection, document management, or direct Supabase credential handling). Instead, communication must happen securely between the Extension Background Service Worker and an Authenticated Local Bridge hosted in the Electron Main process.

### Decision

1. **Architecture & Scope (Slice A)**:
   - Implement the minimal Manifest V3 extension in `apps/extension/` with a Background Service Worker, minimal content script placeholder, and status/pairing popup UI.
   - Host an HTTP REST local bridge in Electron Main (`apps/desktop/electron/bridge/`).
   - Portal adapter interfaces defined in `@jobpilot/portal-adapters` package scaffold.
2. **Strict Loopback Binding & Port**:
   - The bridge strictly binds to `127.0.0.1` on port `4173`.
   - Never bind to `0.0.0.0`, LAN interfaces, or public interfaces.
   - Remote address check enforces `req.socket.remoteAddress` is `127.0.0.1` or `::1`.
3. **Authentication & Secret Management**:
   - Cryptographically random 32-byte hex secret generated per installation.
   - Persisted in Electron app-private storage (`bridge_auth.json` inside Electron `userData`).
   - Authentication via `Authorization: Bearer <secret>` header.
   - Constant-time secret comparison via `crypto.timingSafeEqual` prevents timing attacks.
   - 8-character pairing code fallback allows easy initial setup without hard-coding credentials.
   - Zero exposure of Supabase credentials, database secrets, or file system access to the extension.
4. **Transport Isolation**:
   - The extension content script runs in the isolated webpage context and does NOT speak directly to `127.0.0.1`.
   - The content script sends standard `chrome.runtime.sendMessage` to the Background Service Worker.
   - Only the Background Service Worker makes `fetch()` requests to `http://127.0.0.1:4173`.
5. **Shared Protocol Types**:
   - All bridge payloads and extension message contracts are defined in `@jobpilot/types` (`BridgeHealthResponse`, `BridgePairRequest`, `BridgePairResponse`, `BridgeStatusResponse`, `ExtensionMessage`, `ExtensionResponse`).
6. **Electron Security Invariants**:
   - Renderer context isolation (`contextIsolation: true`), sandboxing (`sandbox: true`), and disabled Node integration (`nodeIntegration: false`) remain strictly enforced.
   - No arbitrary IPC or filesystem primitives exposed.

### Consequences

- Secure, tamper-resistant bridge communication between browser extension and desktop application.
- Extension operates with least privilege (no cloud tokens or DB credentials stored in extension).
- Single source of truth in Electron Desktop App for resume/application preparation in subsequent slices.
