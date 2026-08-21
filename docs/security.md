# JobPilot Security Architecture & Guidelines

## 1. Principles of Defense in Depth

JobPilot handles sensitive user workflows (credentials, resumes, application history) and will eventually interact with external job portals. The architecture enforces security boundaries by default.

---

## 2. Electron Application Security

### 2.1 Window WebPreferences Isolation

Every `BrowserWindow` instance must enforce:

```typescript
webPreferences: {
  preload: path.join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
}
```

- **`contextIsolation: true`**: Guarantees that preload scripts and renderer code run in completely separate JavaScript execution contexts.
- **`nodeIntegration: false`**: Ensures Node.js global symbols (`require`, `process`, `Buffer`, `module`) are never injected into the renderer.
- **`sandbox: true`**: Enables OS-level Chromium renderer process sandboxing.
- **`webSecurity: true`**: Enforces the same-origin policy and blocks insecure mixed content.

---

### 2.2 Strict IPC Architecture

- **No Wildcard Channels**: Generic methods such as `ipcRenderer.send('arbitrary-channel', ...)` or `ipcRenderer.invoke(...)` are never exposed on `window`.
- **Explicit Typed Contracts**: Preload scripts only expose dedicated functions:
  ```typescript
  window.jobPilot.getAppVersion();
  window.jobPilot.getEnvironmentInfo();
  ```

---

### 2.3 Content Security Policy (CSP)

A restrictive CSP is injected into all responses by the main process:

```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
img-src 'self' data: https:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

---

### 2.4 Controlled Navigation & Window Spawning

- **`will-navigate`**: Electron intercepts all page navigation attempts. Any URL outside the authorized local application shell is blocked.
- **`setWindowOpenHandler`**: Spawning new windows (via `window.open` or `<a target="_blank">`) is denied (`{ action: 'deny' }`).

---

## 3. Remote Website & Portal Isolation

> [!IMPORTANT]
> **Third-Party Content Isolation Invariant**:
> When JobPilot eventually interacts with third-party job portals (LinkedIn, Naukri, Indeed, etc.), untrusted portal content must NEVER receive access to:
>
> 1. Electron privileged APIs or IPC bridges.
> 2. Node.js runtime or local filesystem.
> 3. Supabase service-role credentials or database keys.
> 4. Application secrets or Gemini API keys.
> 5. Main application cookies, local storage, or React state.

All future portal automation must execute in isolated browser contexts (e.g. dedicated Playwright worker processes or sandboxed out-of-process webviews).

---

## 4. Supabase & Database Security

- **Public Anon Key**: Only `VITE_SUPABASE_ANON_KEY` is allowed in client-side code. It only permits operations governed by Row Level Security (RLS) policies.
- **No Service-Role Key**: Service-role keys bypass RLS and are strictly prohibited from client bundles and desktop distributions.
