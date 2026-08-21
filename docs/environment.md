# JobPilot Environment Variables Matrix

This document defines all environment variables used in JobPilot, their execution scope, and security sensitivity.

> [!CAUTION]
> **Zero Secret Leaks**: Never commit `.env` files or hardcode real API keys/credentials into source code.

---

## Variable Classification

### 1. Client-Safe / Renderer Variables (Vite Prefixed)

These variables are bundled into the client-side JavaScript code. They MUST NOT contain secret keys.

| Variable Name            | Required | Default       | Description                                                        |
| :----------------------- | :------- | :------------ | :----------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | -             | Public URL for the Supabase project                                |
| `VITE_SUPABASE_ANON_KEY` | Yes      | -             | Public anonymous key for client-side Supabase Auth                 |
| `VITE_APP_ENV`           | No       | `development` | Environment label (`development`, `staging`, `production`, `test`) |

---

### 2. Server-Only Variables (Node.js Services)

These variables are consumed only by backend services (`services/api`). They are NEVER exposed to the desktop renderer or browser.

| Variable Name  | Required | Default       | Description                                                    |
| :------------- | :------- | :------------ | :------------------------------------------------------------- |
| `PORT`         | No       | `3001`        | HTTP port on which the Express API listens                     |
| `NODE_ENV`     | No       | `development` | Node runtime environment (`development`, `production`, `test`) |
| `API_BASE_URL` | No       | -             | Base URL of the API for self-reference or health checks        |

---

### 3. Desktop-Local Variables (Electron Main Process)

These variables configure the Electron desktop application.

| Variable Name       | Required | Default | Description                                          |
| :------------------ | :------- | :------ | :--------------------------------------------------- |
| `DESKTOP_LOG_LEVEL` | No       | `info`  | Minimum log level (`debug`, `info`, `warn`, `error`) |

---

## Prohibited Variables in Phase 2A

The following variables are explicitly prohibited during Phase 2A and must NOT be added:

- `SUPABASE_SERVICE_ROLE_KEY` (Not needed in Phase 2A; must never be in client bundles)
- `GEMINI_API_KEY` (AI features deferred to future phases)
- `LINKEDIN_*`, `NAUKRI_*` credentials (Browser automation deferred)
