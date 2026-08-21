# JobPilot Development Setup Guide

## 1. Prerequisites

- **Operating System**: Windows (tested and supported), macOS, or Linux.
- **Node.js**: `v20.x` or `v22.x` (LTS recommended).
- **Package Manager**: `npm` `v10+`.
- **Git**: Installed and accessible in system PATH.
- **Supabase Project**: A cloud-hosted Supabase project (no local Docker or PostgreSQL required).

---

## 2. Getting Started

### 2.1 Clone & Install

```powershell
# Install all workspace dependencies
npm install
```

### 2.2 Configure Environment Variables

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

Fill in your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
PORT=3001
NODE_ENV=development
```

---

## 3. Development Commands

### Monorepo-Wide Commands

| Command                | Action                                              |
| :--------------------- | :-------------------------------------------------- |
| `npm run build`        | Builds all packages, services, and apps             |
| `npm run typecheck`    | Runs TypeScript type checking across all workspaces |
| `npm run lint`         | Runs ESLint on the entire codebase                  |
| `npm run test`         | Runs all Vitest test suites across the monorepo     |
| `npm run format`       | Formats code with Prettier                          |
| `npm run format:check` | Verifies formatting without modifying files         |

### Workspace-Specific Commands

| Command               | Action                                                         |
| :-------------------- | :------------------------------------------------------------- |
| `npm run dev`         | Starts the React + Vite renderer dev server (port 5173)        |
| `npm run dev:api`     | Starts the Express API service with live reloading (port 3001) |
| `npm run dev:desktop` | Alias for starting the desktop dev environment                 |

---

## 4. Verification Workflow

Before submitting changes, ensure the clean development checklist passes:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```
