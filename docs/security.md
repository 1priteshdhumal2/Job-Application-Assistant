# JobPilot Security Architecture

## 1. Electron Isolation Invariants

The desktop renderer is treated as an isolated UI layer:

```text
contextIsolation: true
nodeIntegration: false
sandbox: true
webSecurity: true
```

- **No Node.js in Renderer**: `process`, `require`, `fs`, and `child_process` are strictly undefined.
- **Typed Preload Bridge**: Only explicit methods (`getAppVersion`, `getEnvironmentInfo`) are exposed via `window.jobPilot`.
- **Navigation Lock**: Intercepts `will-navigate` and blocks `setWindowOpenHandler` to prevent arbitrary window or external origin loading.
- **Content Security Policy (CSP)**: Disallows unsafe-eval and restricts connections strictly to localhost and authorized Supabase endpoints (`https://*.supabase.co`, `wss://*.supabase.co`).

---

## 2. Supabase Credential Boundaries

| Key / Credential            | Scope           | Allowed Locations                  | Strictly Prohibited Locations                          |
| :-------------------------- | :-------------- | :--------------------------------- | :----------------------------------------------------- |
| `VITE_SUPABASE_ANON_KEY`    | Public / Client | `.env`, React renderer, desktop UI | Storing in database tables                             |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin / Backend | Backend services only              | React renderer, Preload, Electron main, `.env.example` |
| `DATABASE_URL` (Direct PG)  | Backend Server  | Backend service only               | Client renderer, Preload                               |

---

## 3. Database Security & Trigger Hardening

### Profile Trigger (`handle_new_user()`)

- Defined with `SECURITY DEFINER` so it can write to `public.profiles` upon `auth.users` row creation.
- **Hardening Rules**:
  - `SET search_path = public`: Prevents malicious search path hijacking.
  - Zero dynamic SQL (`EXECUTE`).
  - Validates and sanitizes metadata extraction (`full_name`, `name`, `avatar_url`, `picture`).
  - Does NOT copy unvetted JSON metadata blobs into columns.
  - Catches exceptions gracefully without blocking user authentication.

### Profiles Row Level Security (RLS)

- `SELECT`: `auth.uid() = id` (User can only read their own profile).
- `UPDATE`: `auth.uid() = id` (User can only edit their own profile).
- `INSERT`: Denied to clients (Trigger-only creation prevents identity spoofing).
- `DELETE`: Denied to clients (Account deletion managed by cascading `auth.users`).

---

## 4. Supabase Storage Security & Isolation

### Bucket Configuration

- Bucket: `user-documents`
- `public = false` (Strictly private).
- File size limit: `26214400` bytes (25 MB).
- Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### Storage RLS Policies

Folder-based ownership is enforced directly on `storage.objects`:

```sql
bucket_id = 'user-documents' AND (storage.foldername(name))[1] = auth.uid()::text
```

- A user authenticated as `User A` cannot list, read, update, or delete files stored under `user-documents/User_B/...`.
- Unauthenticated requests are rejected.

### Client-Side Validation & Path Traversal Protection

- Rejects directory traversal patterns (`../`, `..\`).
- Sanitizes file names to remove control characters and illegal symbols.
- Generates collision-resistant unique filenames (`{prefix}-{randomId}.{ext}`).
- Client service methods (`downloadCurrentUserDocument`, `deleteCurrentUserDocument`) pre-validate that the target path matches the session user before dispatching requests.

---

## 5. Security Credential Separation & Future Isolation

```text
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Boundaries                       │
│  - Supabase: User Profile, Application Data, Documents      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Local Secure Storage                    │
│  - Future: Browser Session Credentials (Local OS Keychain)  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Isolated Web Content                    │
│  - Third-party portals (LinkedIn, Indeed, etc.)             │
│  - Sandboxed & isolated from application secrets            │
└─────────────────────────────────────────────────────────────┘
```
