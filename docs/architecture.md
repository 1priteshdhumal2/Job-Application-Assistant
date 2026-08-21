# JobPilot System Architecture

## 1. Overview

JobPilot is an AI-assisted desktop application designed for job application automation. The architecture is organized as a modular TypeScript monorepo using npm workspaces.

```text
                                  JobPilot
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                 Desktop                           Mobile
                 Electron                       React Native
                    │                            (Deferred)
                  React
                    │
           Application Layer
                    │
         ┌──────────┼──────────┐
         │          │          │
      Profile     Jobs    Applications
      (Core)     (Core)      (Core)
         │          │          │
         └──────────┼──────────┘
                    │
               AI Gateway
                    │
                 Gemini
                    │
             (Future Models)

Electron
   │
Playwright (Isolated Browser Service)
   │
Portal Adapters (LinkedIn / Naukri / Indeed / Wellfound / Hirist / Unstop / ATS)
```

---

## 2. Monorepo Structural Boundaries

### 2.1 Applications (`apps/`)

- **`apps/desktop`**: The primary user application container. Combines the Electron main process, preload bridge, and React Vite renderer.
- **`apps/mobile`**: Deferred React Native companion mobile app.
- **`apps/web`**: Deferred web dashboard.

### 2.2 Backend & Automation Services (`services/`)

- **`services/api`**: Node.js + Express backend foundation providing service health and diagnostics.
- **`services/ai`**: Deferred AI gateway managing Gemini LLM invocations and structured prompting.
- **`services/browser`**: Deferred Playwright automation engine and portal adapters.
- **`services/documents`**: Deferred resume parsing and PDF tailoring service.

### 2.3 Shared Core Packages (`packages/`)

- **`packages/types`**: Branded nominal IDs (`UserId`, `ProfileId`, `JobId`, `ApplicationId`, etc.), IPC contracts, and API models.
- **`packages/validation`**: Zod validation schemas for environment variables and configs.
- **`packages/database`**: Centralized Supabase client abstraction.
- **`packages/shared`**: Cross-cutting constants, custom error classes, and structured logging.
- **`packages/profile-core`**, **`packages/job-core`**, **`packages/application-core`**: Deferred domain logic packages (Phase 2C).

---

## 3. Technology Stack

| Layer               | Technology                      | Purpose                                                      |
| :------------------ | :------------------------------ | :----------------------------------------------------------- |
| **Language**        | TypeScript (v5.7+, strict mode) | Type safety across main, preload, renderer, and services     |
| **Desktop Shell**   | Electron (v34+)                 | Cross-platform desktop runtime with strict sandbox isolation |
| **UI Framework**    | React (v18+) + Vite (v6+)       | Fast, responsive renderer interface                          |
| **Backend API**     | Node.js + Express (v4.21+)      | Lightweight HTTP service foundation                          |
| **Database & Auth** | Supabase (PostgreSQL & Auth)    | Cloud identity and relational storage                        |
| **Validation**      | Zod (v3.24+)                    | Runtime schema validation                                    |
| **Testing**         | Vitest (v3+) + Supertest        | Fast unit and integration testing                            |
| **Workspace**       | npm workspaces                  | Zero-config monorepo package orchestration                   |

---

## 4. Key Architectural Invariants

1. **Strict Context Isolation**: The renderer never accesses Node.js APIs or native primitives directly.
2. **Minimal Typed IPC**: All desktop communication is strongly typed without generic message relays.
3. **Client-Safe Secrets**: Privileged secrets (service-role keys, private API keys) are strictly forbidden in client-side code.
4. **Cloud-First Database**: Uses Supabase PostgreSQL; no local Docker or local PostgreSQL daemon required.
