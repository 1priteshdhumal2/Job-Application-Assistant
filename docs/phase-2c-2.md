# JobPilot — Phase 2C-2 Implementation Report

## Typed Domain Services, State Machine, Soft-Delete & Immutability

### Status

Implemented & Remote Verified

---

## 1. Summary of Completed Objectives

1. **14 Typed Domain Services (`packages/database/src/domain/`)**:
   - `profile-personal.ts`: `getPersonalProfile`, `upsertPersonalProfile`.
   - `experiences.ts`: `listExperiences`, `getExperience`, `createExperience`, `updateExperience`, `deleteExperience`.
   - `education.ts`: `listEducation`, `getEducation`, `createEducation`, `updateEducation`, `deleteEducation`.
   - `skills.ts`: `listSkills`, `getSkill`, `createSkill`, `updateSkill`, `deleteSkill` (case-insensitive duplicate `ConflictError`).
   - `certifications.ts`: `listCertifications`, `getCertification`, `createCertification`, `updateCertification`, `deleteCertification`.
   - `languages.ts`: `listLanguages`, `getLanguage`, `createLanguage`, `updateLanguage`, `deleteLanguage` (case-insensitive duplicate `ConflictError`).
   - `profile-links.ts`: `listProfileLinks`, `getProfileLink`, `createProfileLink`, `updateProfileLink`, `deleteProfileLink`.
   - `profile-preferences.ts`: `getProfilePreferences`, `upsertProfilePreferences`.
   - `documents.ts`: `listDocuments`, `getDocument`, `listDocumentVersions`, `uploadDocument`, `replaceDocumentVersion`, `deactivateDocument`, `downloadDocument`.
   - `portals.ts`: `listPortals`, `getPortalByCode` (read-only reference catalog).
   - `jobs.ts`: `listJobs`, `getJob`, `createJob`, `updateJob`, `deleteJob` (user-owned).
   - `applications.ts`: `listApplications`, `getApplication`, `listDeletedApplications`, `getDeletedApplication`, `createApplication`, `updateApplication`, `transitionApplicationStatus`, `softDeleteApplication`, `restoreApplication`.
   - `answer-bank.ts`: `listAnswerBank`, `getAnswerBankEntry`, `getAnswerByConceptKey`, `createAnswerBankEntry`, `updateAnswerBankEntry`, `deleteAnswerBankEntry`.
   - `application-answers.ts`: `listApplicationAnswers`, `getApplicationAnswer`, `createApplicationAnswer` (immutable snapshots; NO update/delete methods).

2. **Common Infrastructure (`packages/database/src/common/`)**:
   - `auth.ts`: `requireAuthUser()` derives user identity strictly from `supabase.auth.getUser()`. Zero caller-supplied user IDs.
   - `pagination.ts`: Clamped pagination helper (default 20, max 100) returning `PaginatedResult<T>`.
   - `sorting.ts`: Strict allowlist sorting validation.
   - `errors.ts`: Typed domain error hierarchy (`AuthError`, `ValidationError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `InvalidStateTransitionError`, `ConcurrencyConflictError`, `StorageError`, `DatabaseError`).

3. **Database Schema & Lifecycle Migration (`00005_harden_domain_schema_and_lifecycle.sql`)**:
   - Soft-delete column `deleted_at` added to `public.applications` with partial indexes.
   - Document group identity column `document_group_id` and active version constraint `uq_documents_group_active` on `public.documents`.
   - Application answer immutability: Revoked `UPDATE` and `DELETE` grants from `authenticated` and `anon`; added `trg_prevent_application_answer_mutation` trigger.
   - Atomic PostgreSQL stored functions: `transition_application_status` (atomic status machine with `FOR UPDATE` lock) and `create_document_version` (atomic version replacement).
   - Strict `SECURITY INVOKER` and controlled `search_path = public` on functions and triggers.

4. **Storage & Database Consistency**:
   - Implemented storage upload compensation in `uploadDocument` and `replaceDocumentVersion` to automatically clean up orphan binaries if PostgreSQL metadata insert fails.

5. **Automated Testing Suite**:
   - 14 domain unit test suites in `packages/database/test/domain/`.
   - Comprehensive real remote Supabase integration test suite in `packages/database/test/integration/remote-supabase.integration.test.ts` covering 19 end-to-end multi-tenant security scenarios.

---

## 2. Migrations Created / Applied

| Migration File                                 | Purpose                                                                        | Status  |
| :--------------------------------------------- | :----------------------------------------------------------------------------- | :------ |
| `00005_harden_domain_schema_and_lifecycle.sql` | Soft-delete, document group identity, answer immutability trigger, atomic RPCs | APPLIED |
| `00006_create_test_auth_users.sql`             | Test environment auth users for integration test suite                         | APPLIED |
| `00007_job_deletion_restrict_fk.sql`           | Restrict Job deletion when Applications exist (`ON DELETE RESTRICT`)           | APPLIED |

---

## 3. ADRs Added in Phase 2C-2

- **ADR 014**: Domain Service Layer Architecture & Session Identity Derivation
- **ADR 015**: Atomic Database-Level Application State Machine
- **ADR 016**: Application Soft Deletion & Active Record Isolation
- **ADR 017**: Document Logical Group Versioning & Storage Compensation
- **ADR 018**: Database-Enforced Immutable Application Answers
- **ADR 019**: Standard Collection Pagination, Filtering & Sorting
- **ADR 020**: Job Deletion Restrict Invariant & Historical Application Preservation

---

## 4. Verification Results

- `npm run typecheck`: **PASS** (0 errors)
- `npm run lint`: **PASS** (0 warnings/errors)
- `npm run test`: **PASS** (27 test files, 107 tests passed)
- `npm run build`: **PASS** (All packages built successfully)
- `npm run format:check`: **PASS** (All files formatted cleanly)
- Real Remote Supabase Integration Tests: **PASS** (8 integration suites covering 20 real multi-tenant security & lifecycle scenarios against remote database `nhbtvffsainbutsdzyht`)
