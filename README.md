# JobPilot

> **AI-Assisted Job Application Automation Desktop Application**

JobPilot is a desktop application designed to streamline and automate job application workflows across leading hiring platforms while maintaining rigorous security, candidate control, and data privacy.

---

## Current Status: Phase 2A Foundation

Phase 2A establishes the production-ready repository, monorepo workspaces, strict TypeScript configuration, Electron & React desktop foundation, Node.js API foundation, and Supabase authentication integration.

### Monorepo Architecture

```text
Job-Application-Assistant/
│
├── apps/
│   ├── desktop/             # Electron + React + Vite desktop application
│   ├── mobile/              # Mobile companion placeholder (deferred)
│   └── web/                 # Web portal placeholder (deferred)
│
├── services/
│   ├── api/                 # Express + TypeScript service foundation (GET /health)
│   ├── ai/                  # AI gateway placeholder (deferred)
│   ├── browser/             # Browser automation placeholder (deferred)
│   └── documents/           # Document processing placeholder (deferred)
│
├── packages/
│   ├── types/               # Shared domain IDs & IPC contracts
│   ├── validation/          # Zod environment & config validation schemas
│   ├── database/            # Supabase client abstraction & DB access layer
│   ├── shared/              # Shared constants, errors, and logger
│   ├── profile-core/        # Profile domain placeholder (deferred)
│   ├── job-core/            # Job domain placeholder (deferred)
│   └── application-core/    # Application domain placeholder (deferred)
│
├── supabase/                # Supabase CLI configuration & migrations
├── docs/                    # Architectural decisions, flows, and security guidelines
└── scripts/                 # Development automation scripts
```

---

## Quick Start

### Prerequisites

- Node.js `v20+` or `v22+`
- npm `v10+`
- A Supabase Project (PostgreSQL hosted by Supabase; no local Docker or local PostgreSQL required)

### Setup & Installation

1. Clone the repository and install all workspace dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Provide your Supabase URL and public Anonymous Key in `.env`.

3. Run verification checks:

   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

4. Start development environments:
   - **React / Vite Renderer**:
     ```bash
     npm run dev
     ```
   - **API Service**:
     ```bash
     npm run dev:api
     ```

---

## Security Architecture

- **Context Isolation & Sandboxing**: The Electron renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- **Minimal Typed IPC**: Preload scripts only expose explicit typed methods under `window.jobPilot`.
- **Zero Secret Exposure**: Service-role keys and sensitive credentials are never bundled into client distributions.

For full architectural details and ADRs, see the [`docs/`](./docs) directory.
