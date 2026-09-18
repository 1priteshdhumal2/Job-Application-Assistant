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

    User->>React: Submit New Display Name
    React->>Service: updateCurrentProfile(supabase, { display_name })
    Service->>Client: supabase.auth.getUser()
    Client-->>Service: Return authenticated User { id }
    Service->>DB: UPDATE profiles SET display_name = ... WHERE id = auth.uid()
    Note over DB: Enforces RLS & sets updated_at = NOW()
    DB-->>Service: Return updated Profile row
    Service-->>React: Return typed Profile object
    React-->>User: Show Success Toast / Refresh Profile State
```

---

## 4. Electron IPC Bridge Security Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Renderer as React Renderer (BrowserWindow)
    participant Bridge as Preload contextBridge (window.jobPilot)
    participant Main as Electron Main Process (IPC Handlers)
    participant Validation as @jobpilot/validation (Zod)
    participant Database as @jobpilot/database (Supabase Client)

    Renderer->>Bridge: window.jobPilot.profile.update({ display_name })
    Note over Bridge: contextIsolation: true<br/>nodeIntegration: false<br/>sandbox: true
    Bridge->>Main: ipcRenderer.invoke('profile:update', payload)
    Main->>Validation: profileSchema.parse(payload)
    alt Validation Failure
        Validation-->>Main: ZodError
        Main-->>Renderer: Return { error: { code: 'VALIDATION_ERROR', ... } }
    else Validation Success
        Main->>Database: updateCurrentProfile(supabase, validatedPayload)
        Database-->>Main: Return Profile
        Main-->>Renderer: Return { data: Profile }
    end
```

---

## 5. Document Storage Upload Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Documents View
    participant Service as @jobpilot/database (storage.ts)
    participant Storage as Supabase Storage Bucket ('documents')
    participant DB as PostgreSQL (public.documents)

    User->>UI: Select File (e.g. resume.pdf)
    UI->>Service: uploadDocument(supabase, { file, category: 'resumes' })
    Note over Service: 1. Validate file type (PDF/DOCX) & size (<5MB)<br/>2. Generate sanitized storage path: {userId}/resumes/{uuid}.pdf
    Service->>Storage: upload(storagePath, file, { contentType })
    Storage-->>Service: Upload OK
    Service->>DB: INSERT INTO public.documents (user_id, file_name, file_path, ...)
    DB-->>Service: Return Document row
    Service-->>UI: Return Document metadata
    UI-->>User: Display Document in Library
```

---

## 6. Applications State Machine & Document Replacement Flow

### Atomic Application Status Transition

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Service as Applications Service
    participant RPC as transition_application_status (PostgreSQL RPC)
    participant DB as Applications Table

    Client->>Service: transitionApplicationStatus(appId, 'APPLIED')
    Service->>RPC: RPC transition_application_status(appId, 'APPLIED')
    Note over RPC: Verify auth.uid() IS NOT NULL
    RPC->>DB: SELECT * FROM applications WHERE id=appId AND user_id=auth.uid() FOR UPDATE
    alt Application Not Found or Soft-Deleted
        DB-->>RPC: 0 rows returned
        RPC-->>Service: Exception P0002 (APPLICATION_NOT_FOUND)
        Service-->>Client: NotFoundError
    else Application Found
        Note over RPC: Evaluate state machine (SAVED -> APPLIED allowed)
        alt Transition Illegal
            RPC-->>Service: Exception P0001 (INVALID_STATUS_TRANSITION)
            Service-->>Client: InvalidStateTransitionError
        else Transition Allowed
            RPC->>DB: UPDATE status='APPLIED', applied_at=NOW(), updated_at=NOW()
            DB-->>RPC: Return updated Application row
            RPC-->>Service: Return Application
            Service-->>Client: Return Application
        end
    end
```

### Document Replacement & Storage Compensation

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Service as Documents Service
    participant Storage as Supabase Storage Bucket
    participant RPC as create_document_version (PostgreSQL RPC)
    participant DB as Documents Table

    Client->>Service: replaceDocumentVersion(groupId, { file, fileName })
    Service->>DB: Query current active document metadata for groupId
    DB-->>Service: Return active DocumentRecord
    Service->>Storage: Upload binary to user-documents/{userId}/{category}/{uniqueName}
    alt Storage Upload Fails
        Storage-->>Service: Upload Error
        Service-->>Client: StorageError
    else Storage Upload Succeeds
        Storage-->>Service: Upload OK
        Service->>RPC: RPC create_document_version(groupId, storagePath, metadata...)
        alt RPC / DB Version Creation Fails
            RPC-->>Service: DB / RPC Error
            Note over Service: Storage Compensation Triggered
            Service->>Storage: Delete orphan newly-uploaded binary
            Service-->>Client: DatabaseError / ConflictError / ForbiddenError
        else RPC / DB Version Creation Succeeds
            Note over RPC: Lock active row FOR UPDATE,<br/>deactivate old version (is_active=false),<br/>insert new version (version=v+1, is_active=true)
            RPC->>DB: Atomically update & insert
            DB-->>RPC: Return new DocumentRecord
            RPC-->>Service: Return DocumentRecord
            Service-->>Client: Return new DocumentRecord
        end
    end
```

---

## 7. Repeatable Application Preparation & Use Cases Layer Flow

```mermaid
sequenceDiagram
    autonumber
    actor Adapter as Electron IPC / REST API Transport
    participant UseCase as @jobpilot/use-cases (executePrepareApplication)
    participant DBService as @jobpilot/database (prepareApplication)
    participant RPC as prepare_application (PostgreSQL Stored Function)
    participant DB as PostgreSQL Tables (preparations, answers, applications)

    Adapter->>UseCase: executePrepareApplication(context, input)
    Note over UseCase: 1. Validate input schema with Zod<br/>2. Verify authenticated session<br/>3. Assign client idempotency_key if omitted
    UseCase->>DBService: prepareApplication(supabase, validatedInput)
    DBService->>RPC: RPC prepare_application(params...)

    Note over RPC: 1. Verify auth.uid()<br/>2. Check existing idempotency_key
    alt Idempotency Key Exists
        alt Payload Hash Matches
            RPC-->>DBService: Return existing Application (Idempotent 200 OK)
            DBService-->>UseCase: Return Application
            UseCase-->>Adapter: Return Application
        else Payload Hash Mismatch
            RPC-->>DBService: Raise Exception P0003 (Conflict 409)
            DBService-->>UseCase: Throw ConflictError
        end
        Note over RPC: 3. Lock jobs & documents FOR SHARE<br/>4. Lock or create application FOR UPDATE<br/>5. Validate strictly pre-submission status (SAVED / INTERESTED)<br/>6. Calculate sequential preparation_number<br/>7. Insert immutable application_preparations record<br/>8. Bulk insert application_answers snapshots<br/>9. Update applications.latest_preparation_id pointer
        RPC->>DB: Atomically commit all records
        DB-->>RPC: Return updated Application
        RPC-->>DBService: Return Application
        DBService-->>UseCase: Return Application
        UseCase-->>Adapter: Return Application
    end
```

> **Pre-Submission Invariant**: Application preparation is strictly allowed only while status is `SAVED` or `INTERESTED`. Attempting preparation on `APPLIED`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `REJECTED`, `WITHDRAWN`, or archived applications is immediately rejected (`APPLICATION_STATUS_NOT_PREPARABLE` / `APPLICATION_IS_ARCHIVED`). No `PREPARED`, `READY`, or `DRAFT` status exists.

---

## 8. Document Content Hashing & Duplicate Detection Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Service as @jobpilot/database (uploadDocument / replaceDocumentVersion)
    participant Validation as @jobpilot/validation (calculateContentHash)
    participant DB as PostgreSQL (public.documents)
    participant Storage as Supabase Storage (user-documents)

    User->>Service: Upload Document (file, fileName, category, documentType)
    Service->>Validation: validateFileForUpload(file)
    Note over Service: 1. Validate file extension, size, and MIME type
    Service->>Validation: calculateContentHash(file)
    Validation-->>Service: Return 64-char SHA-256 Hex Hash

    Service->>DB: findDocumentByContentHash(user_id, content_hash)
    alt Content Hash Exists in User's Library
        DB-->>Service: Return Existing DocumentRecord
        Service-->>User: Throw ConflictError("A document with identical content already exists in your library")
        Note over Service: Storage upload aborted (zero wasted bandwidth/storage)
    else Unique Content
        DB-->>Service: Return null
        Service->>Storage: upload(storagePath, binary)
        alt Storage Upload Fails
            Storage-->>Service: StorageError
            Service-->>User: Throw StorageError
        else Storage Upload Succeeds
            Service->>DB: INSERT into documents (with content_hash) / RPC create_document_version
            alt DB Insert / RPC Fails (e.g. concurrent race)
                DB-->>Service: Error / Constraint Violation
                Note over Service: Storage Compensation Triggered
                Service->>Storage: remove([storagePath])
                Service-->>User: Map to ConflictError / DatabaseError
            else DB Insert / RPC Succeeds
                DB-->>Service: Return DocumentRecord
                Service-->>User: Return DocumentRecord (Version 1 / Version N+1)
            end
        end
    end
```

> **MVP Migration State & Duplicate Identity Invariant**: Duplicate identity is strictly defined as `(user_id, content_hash)` where `content_hash` is the SHA-256 hash of the exact stored binary bytes. For the fast-tracked MVP, legacy documents created prior to Phase 2D-2C-3A may have `content_hash = NULL` until a future administrative backfill is executed. All subsequent uploads and version replacements compute and enforce SHA-256 hashes unconditionally. Multi-tenant uploads of identical content by different users are fully isolated and permitted.

---

## 9. Desktop Document Upload Vertical Slice Flow (Phase 2D-2C-3B)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant DocumentsPage as DocumentsPage.tsx
    participant IPC as window.jobPilot (Preload/Electron Main)
    participant Modal as UploadDocumentModal.tsx
    participant UseCase as @jobpilot/use-cases (executeUploadUserDocument)
    participant Domain as @jobpilot/database (uploadDocument)
    participant Storage as Supabase Storage (user-documents)
    participant DB as PostgreSQL (public.documents)

    User->>DocumentsPage: Click "+ Upload Document"
    DocumentsPage->>IPC: selectDocumentFile()
    IPC-->>DocumentsPage: Return SelectedDocumentFile { fileName, fileSize, mimeType, fileData }
    DocumentsPage->>Modal: Open Modal with SelectedDocumentFile

    Note over Modal: 1. Derive Initial Name (strip extension)<br/>2. User selects Document Type<br/>3. Category auto-derived (read-only)
    User->>Modal: Edit name & click "Upload"
    Modal->>UseCase: executeUploadUserDocument({ supabase }, { file, fileName, name, category, documentType })
    UseCase->>Domain: uploadDocument(supabase, input)

    Note over Domain: 1. Validate file (size <= 25MB, ext)<br/>2. SHA-256 contentHash calculation<br/>3. Check existing contentHash per user

    alt Duplicate Hash Found in User Library
        Domain-->>UseCase: Throw ConflictError
        UseCase-->>Modal: Propagate ConflictError
        Note over Modal: Display "A document with identical content already exists in your library."
    else Unique Content
        Domain->>Storage: upload(storagePath, binary)
        alt Storage Upload Succeeds
            Domain->>DB: INSERT into documents (version=1, is_active=true, document_group_id=uuid, content_hash)
            DB-->>Domain: Return DocumentRecord
            Domain-->>UseCase: Return DocumentRecord
            UseCase-->>Modal: Return DocumentRecord
            Modal->>DocumentsPage: onSuccess(document)
            Note over DocumentsPage: 1. Close Modal<br/>2. Show success banner<br/>3. Call refresh() to update DocumentTable
            DocumentsPage-->>User: Render updated document list with newly uploaded document
        end
    end
```

---

## 10. Extension ↔ Desktop Local Bridge Communication Flow (Phase 2D-3 Slice A)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Popup as Extension Popup / Content Script
    participant SW as Background Service Worker (apps/extension)
    participant Client as ExtensionBridgeClient
    participant Bridge as Electron Main BridgeServer (127.0.0.1:4173)
    participant Auth as BridgeAuthManager
    participant Main as Electron Main State

    User->>Popup: Open Extension / Check Status
    Popup->>SW: chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' })
    SW->>Client: checkHealth()
    Client->>Bridge: GET http://127.0.0.1:4173/api/v1/bridge/health [Authorization: Bearer <secret>?]

    alt Desktop Not Running (Connection Refused)
        Bridge--xClient: Connection Refused / Timeout
        Client-->>SW: Throw error ("JobPilot Desktop is not running")
        SW-->>Popup: { success: false, error: "Desktop disconnected" }
        Popup-->>User: Show "JobPilot Desktop Disconnected" UI
    else Desktop Running & Healthy
        Bridge->>Auth: Validate Token (if provided)
        Bridge-->>Client: 200 OK { status: 'ok', authenticated: true/false, version: '1.0.0' }
        Client-->>SW: Return BridgeHealthResponse
        SW-->>Popup: { success: true, data: { status: 'ok', authenticated: true/false } }

        alt Unauthenticated (Initial Pairing)
            Popup-->>User: Show Pairing Screen (Enter Pairing Code)
            User->>Popup: Enter 8-character Pairing Code
            Popup->>SW: chrome.runtime.sendMessage({ type: 'PAIR_BRIDGE', payload: { pairingCode } })
            SW->>Client: pair(pairingCode)
            Client->>Bridge: POST http://127.0.0.1:4173/api/v1/bridge/pair { pairingCode }
            Bridge->>Auth: verifyPairingCode(code)
            alt Valid Pairing Code
                Auth-->>Bridge: OK, return secret
                Bridge-->>Client: 200 OK { success: true, token: "<secret>" }
                Client->>Client: Store secret in chrome.storage.local
                Client-->>SW: { success: true }
                SW-->>Popup: { success: true }
                Popup-->>User: Show "Connected & Paired" Status
            else Invalid Pairing Code
                Auth-->>Bridge: Invalid
                Bridge-->>Client: 401 Unauthorized { error: "Invalid pairing code" }
                Client-->>SW: { success: false, error: "Invalid pairing code" }
                SW-->>Popup: { success: false }
                Popup-->>User: Show "Invalid code, try again"
            end
        else Already Authenticated
            Popup-->>User: Show "Connected to JobPilot Desktop"
        end
    end
```
