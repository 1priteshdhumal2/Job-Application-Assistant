# JobPilot — Phase 2B Implementation Report

## Authentication, Identity, Storage & Security Foundation

### Status

Implemented & Verified

---

## 1. Summary of Completed Objectives

1. **Supabase Authentication Lifecycle**:
   - Integrated Email/Password registration with required email verification (`email_confirmed_at`).
   - Integrated Google OAuth trigger with Supabase redirect handling.
   - Smooth session restoration without UI flicker across app restarts.
2. **Minimal Identity Model (`profiles`)**:
   - Created `public.profiles` (`id`, `display_name`, `avatar_url`, `onboarding_status`, `created_at`, `updated_at`).
   - Identity mapping: `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE`.
   - `onboarding_status` CHECK constraint: `NOT_STARTED` / `ACTIVE`.
3. **Database Trigger (`handle_new_user()`)**:
   - `SECURITY DEFINER` function with `SET search_path = public`.
   - Automatically provisions `profiles` row upon `auth.users` insert with precedence: `full_name` -> `name` -> `email local-part`.
4. **Row Level Security (RLS)**:
   - `profiles`: SELECT/UPDATE allowed only for `auth.uid() = id`; INSERT/DELETE denied to normal clients.
   - `storage.objects`: SELECT/INSERT/UPDATE/DELETE allowed only when `(storage.foldername(name))[1] = auth.uid()::text`.
5. **Private Document Storage (`user-documents`)**:
   - Private bucket (`public = false`, 25MB limit, PDF/DOCX/XLSX only).
   - User-scoped path structure: `user-documents/{user_id}/{category}/{filename}`.
   - Allowed categories: `resumes`, `cover-letters`, `certificates`, `portfolio`, `other`.
   - Path sanitization and directory traversal protection (`../`, `..\`).
6. **Data Access Services**:
   - Profile Service: `getCurrentProfile(supabase)`, `updateCurrentProfile(supabase, updates)` (caller does not supply `userId`).
   - Storage Service: `uploadCurrentUserDocument`, `listCurrentUserDocuments`, `downloadCurrentUserDocument`, `deleteCurrentUserDocument`.
7. **React Desktop Application UI**:
   - Protected shell gating unauthenticated/unverified users.
   - Verification Pending UI with resend verification capability.
   - Profile Panel (view, edit display name and avatar).
   - Storage Verification Card (category selection, file upload, list, download, delete).
8. **Automated Testing Suite**:
   - Vitest unit tests covering file MIME validation, 25MB size limit, path sanitization, traversal protection, profile updates, and storage isolation.

---

## 2. Migrations Created

| Migration File                                 | Purpose                             | Key Entities Created                                                            |
| :--------------------------------------------- | :---------------------------------- | :------------------------------------------------------------------------------ |
| `00001_create_profiles.sql`                    | Create identity table & RLS         | `public.profiles` table, `handle_updated_at()` trigger function, RLS policies   |
| `00002_create_profile_trigger.sql`             | Auto-create profile on signup       | `handle_new_user()` `SECURITY DEFINER` function, `on_auth_user_created` trigger |
| `00003_create_storage_bucket_and_policies.sql` | Private storage bucket & folder RLS | `user-documents` bucket in `storage.buckets`, RLS policies on `storage.objects` |

---

## 3. Strict Boundary Checklist

- [x] Only ONE domain table created (`profiles`)
- [x] Trigger and functions created with strict `search_path = public`
- [x] Only ONE storage bucket created (`user-documents`)
- [x] No `documents` metadata table created
- [x] No domain tables created (`jobs`, `applications`, `experiences`, `skills`, `ai_runs`, etc.)
- [x] No AI libraries installed (Gemini, OpenAI, LangChain, etc.)
- [x] No Playwright / browser automation installed
- [x] No portal scrapers installed
- [x] No git commits or pushes performed

---

## 4. Testing Status & Deferred Verification

- **Remote Supabase Schema & Object Verification**: REAL (Verified against live Supabase project `nhbtvffsainbutsdzyht`).
- **Profile Trigger & updated_at Trigger**: REAL (Applied and verified in PostgreSQL).
- **Profile RLS & Storage Folder Policies**: REAL (Active and enforced on remote database).
- **Unauthenticated Access Rejection**: REAL (Verified remote rejection: HTTP 403 / code 42501 `permission denied for table profiles`).
- **Client State Machine & Validation Test Suites**: REAL (46 passing Vitest unit/integration tests).
- **Full Authenticated User A → User B Adversarial RLS Test**: DEFERRED (To be executed in future security/UAT phase).
- **Real Email Inbox Delivery**: DEFERRED / BLOCKED (Subject to Supabase default free-tier SMTP provider rate limits).
