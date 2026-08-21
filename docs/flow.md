# JobPilot System & Runtime Flows

This document details the critical execution flows, lifecycles, and security boundaries across **JobPilot**.

---

## 1. Authentication & Session Initialization Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Desktop as Electron / React Shell
    participant AuthContext as AuthContext / useAuth
    participant Supabase as Supabase Auth (Cloud)

    Desktop->>AuthContext: Application Startup (mount)
    AuthContext->>Supabase: getSession()
    alt Session Exists
        Supabase-->>AuthContext: Return active session & user
        alt Email Provider & email_confirmed_at is NULL
            AuthContext->>Desktop: State -> VERIFICATION_REQUIRED
            Desktop-->>User: Render Verification Pending Card
        else Verified or OAuth Provider
            AuthContext->>Desktop: State -> AUTHENTICATED
            Desktop-->>User: Render Authenticated Application Shell
        end
    else No Session
        AuthContext->>Desktop: State -> UNAUTHENTICATED
        Desktop-->>User: Render Login / Register Tabs
    end
```

---

## 2. User Registration & Database Trigger Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React as React UI
    participant Auth as Supabase Auth
    participant DB as PostgreSQL (auth.users)
    participant Trigger as handle_new_user() Trigger
    participant Profiles as public.profiles Table

    User->>React: Register(email, password)
    React->>Auth: signUp(email, password)
    Auth->>DB: INSERT INTO auth.users
    DB->>Trigger: AFTER INSERT trigger on_auth_user_created
    Note over Trigger: SECURITY DEFINER (search_path=public)<br/>Extracts display_name & avatar_url
    Trigger->>Profiles: INSERT INTO public.profiles (id, display_name, avatar_url, 'NOT_STARTED')
    Auth-->>React: User Created (Confirmation Email Sent)
    React->>User: Display "Verification Link Sent to Email"
```

---

## 3. Profile Data Access & Update Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React as ProfilePanel.tsx
    participant Service as @jobpilot/database (profile.ts)
    participant Client as Supabase Browser Client
    participant DB as PostgreSQL (public.profiles)

    User->>React: Open Profile / Edit Display Name
    React->>Service: getCurrentProfile(supabase)
    Service->>Client: supabase.auth.getUser()
    Client-->>Service: Return authenticated User { id }
    Service->>DB: SELECT * FROM profiles WHERE id = auth.uid()
    Note over DB: Enforces RLS: auth.uid() = id
    DB-->>Service: Return Profile row
    Service-->>React: Return typed Profile object
    React-->>User: Display Form (Email, Name, Avatar, Status)

    User->>React: Save Changes(display_name, avatar_url)
    React->>Service: updateCurrentProfile(supabase, updates)
    Service->>Service: validateProfileUpdate(updates) via Zod
    Service->>Client: supabase.auth.getUser()
    Service->>DB: UPDATE profiles SET display_name=..., avatar_url=... WHERE id = auth.uid()
    Note over DB: Enforces RLS & set_profiles_updated_at trigger
    DB-->>Service: Return updated row
    Service-->>React: Return updated Profile
```

---

## 4. User-Scoped Private Document Storage Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React as StorageVerification.tsx
    participant Service as @jobpilot/database (storage.ts)
    participant Validation as @jobpilot/validation (file.ts)
    participant Client as Supabase Browser Client
    participant Storage as Supabase Storage (user-documents)

    User->>React: Select file (e.g. resume.pdf) & Category ("resumes")
    React->>Validation: validateFileForUpload(file)
    Note over Validation: Checks MIME in [pdf, docx, xlsx]<br/>Checks size <= 25MB<br/>Sanitizes filename (no ../ or ..\)
    Validation-->>React: Valid: true, sanitizedName

    React->>Service: uploadCurrentUserDocument(supabase, category, file, fileName)
    Service->>Client: supabase.auth.getUser()
    Client-->>Service: Return User { id }
    Service->>Validation: generateStoragePath(user.id, category, fileName)
    Note over Service: Path: {userId}/resumes/resume-uniqueId.pdf
    Service->>Storage: upload(storagePath, file)
    Note over Storage: Storage RLS Policy:<br/>(storage.foldername(name))[1] = auth.uid()
    Storage-->>Service: Upload Success
    Service-->>React: Return UserDocumentMetadata
    React-->>User: Refresh list & show file
```

---

## 5. Cross-Tenant Storage Isolation Enforcement

```text
User A (UUID: 1111-1111)                User B (UUID: 2222-2222)
      │                                       │
      ▼                                       ▼
user-documents/                         user-documents/
  1111-1111/resumes/resume.pdf            2222-2222/resumes/cv.docx
      │                                       │
      ├───────────────────┬───────────────────┤
      │                   │                   │
      ▼                   ▼                   ▼
[User A Session]    [User B Session]    [Unauthenticated]
   SELECT A: ALLOW     SELECT A: DENY      SELECT A: DENY
   SELECT B: DENY      SELECT B: ALLOW     SELECT B: DENY
   DELETE A: ALLOW     DELETE A: DENY      DELETE A: DENY
```
