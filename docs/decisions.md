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
- Service-role clients are explicitly prohibited in Phase 2A and will never be exposed to the renderer or browser contexts.

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

## ADR 006: Delayed Application Database Schema Implementation

### Status

Accepted

### Context

Phase 2A focuses solely on foundation infrastructure (repository, Electron, React, Node.js API health, Supabase Auth setup, tooling). Creating full database schemas (profiles, jobs, applications) prematurely risks churn before domain requirements are solidified.

### Decision

Defer application schema creation (`00001_initial_auth_schema.sql`, `profiles`, `jobs`, `applications`, etc.) to **Phase 2C**. Phase 2A uses Supabase's native `auth.users` for authentication without creating custom application tables.

### Consequences

- Clean boundary for Phase 2A foundation.
- Schema design and migrations can be methodically planned in Phase 2C.
