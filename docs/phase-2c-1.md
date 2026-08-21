# JobPilot — Phase 2C-1 Implementation Report

## Domain Database Schema + RLS Foundation

### Status

Implemented & Remote Verified

---

## 1. Summary of Completed Objectives

1. **Canonical 14-Table Domain Database Schema**:
   - Created `supabase/migrations/00004_create_jobpilot_domain_schema.sql` implementing all 14 specified tables:
     - `profile_personal`: 1-to-1 personal details, contact info, notice period >= 0.
     - `experiences`: Work history with start/end date validation and `is_current` logic.
     - `education`: Degrees, institutions, fields of study, start/end dates.
     - `skills`: Skills with case-insensitive uniqueness index `(user_id, LOWER(skill_name))` and years of experience >= 0.
     - `certifications`: Credentials, issuer, dates, and verification links.
     - `languages`: Language proficiencies with case-insensitive uniqueness `(user_id, LOWER(language))`.
     - `profile_links`: Professional URLs (`LINKEDIN`, `GITHUB`, `PORTFOLIO`, `STACKOVERFLOW`, `OTHER`).
     - `profile_preferences`: Search criteria, JSONB preference lists, CTC >= 0.
     - `documents`: Document metadata, 25MB limit, MIME whitelist, storage path format check.
     - `portals`: Global reference catalog seeded with 7 official job portals.
     - `jobs`: User-scoped job opportunities, salary constraints (`salary_max >= salary_min`).
     - `applications`: User-scoped applications linking jobs and document IDs.
     - `answer_bank`: Canonical user defaults with unique `concept_key` per user.
     - `application_answers`: Immutable point-in-time snapshots of submitted question-answers.
2. **Database-Level Composite Foreign Key Tenant Isolation**:
   - `applications (job_id, user_id)` -> `jobs (id, user_id)`
   - `applications (resume_document_id, user_id)` -> `documents (id, user_id)`
   - `applications (cover_letter_document_id, user_id)` -> `documents (id, user_id)`
   - `application_answers (application_id, user_id)` -> `applications (id, user_id)`
3. **Row Level Security (RLS) & Table Grants**:
   - User-owned tables: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.
   - Portals table: Read-only SELECT for authenticated users; write privileges revoked.
   - Anonymous access: Revoked across all 14 tables (HTTP 403 / code 42501).
4. **Triggers & Automatic Timestamps**:
   - Reused `public.handle_updated_at()` trigger across all 14 tables.
5. **TypeScript Domain Contracts (`packages/types`)**:
   - Created `profile-domain.ts`, `document-domain.ts`, `portal-domain.ts`, `job-domain.ts`, `application-domain.ts`, and `answer-domain.ts`.
6. **Zod Validation Schemas (`packages/validation`)**:
   - Created validation schemas for all domain entities, field boundaries, date ordering, and enum sets.
7. **Automated Testing Suite**:
   - Added 5 new test suites in `packages/validation/test/` covering all domain entity validations (21 new tests, 67 total tests).

---

## 2. Migrations Created

| Migration File                            | Purpose                                     | Key Entities Created                                                                          |
| :---------------------------------------- | :------------------------------------------ | :-------------------------------------------------------------------------------------------- |
| `00004_create_jobpilot_domain_schema.sql` | Canonical domain schema, RLS, composite FKs | 14 domain tables, composite keys, triggers, RLS policies, table grants, 7 portal seed records |

---

## 3. Strict Boundary Checklist

- [x] All 14 domain tables created exactly as specified
- [x] No additional domain tables created
- [x] No UI or React components created or modified for domain entities
- [x] No CRUD services created in `packages/database`
- [x] No API endpoints created in `services/api`
- [x] No AI libraries installed (Gemini, OpenAI, LangChain, etc.)
- [x] No Playwright / browser automation installed
- [x] No portal scrapers installed
- [x] Zero Git commits created
- [x] Zero Git pushes performed

---

## 4. Verification Classification

- **Local Unit & Validation Tests**: REAL (67/67 passing Vitest tests).
- **Remote Database Schema Verification**: REAL (All 14 tables, triggers, indexes, RLS, and grants verified on Supabase project `nhbtvffsainbutsdzyht`).
- **Real Two-User PostgreSQL Integrity & Attack Tests**: REAL (Verified composite FK violations blocked cross-tenant job, resume, and application answer references).
- **Anonymous Access Verification**: REAL (Verified HTTP 403 / code 42501 on all 14 tables).
