-- ==============================================================================
-- Migration: 00004_create_jobpilot_domain_schema.sql
-- Description: Creates the canonical 14 domain tables for JobPilot with Row Level Security,
--              composite foreign key cross-tenant isolation, triggers, indexes, and seed data.
-- ==============================================================================

-- ==============================================================================
-- 1. TABLE: profile_personal
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profile_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NULL,
  middle_name TEXT NULL,
  last_name TEXT NULL,
  phone TEXT NULL,
  country TEXT NULL,
  state TEXT NULL,
  city TEXT NULL,
  postal_code TEXT NULL,
  professional_title TEXT NULL,
  current_company TEXT NULL,
  current_designation TEXT NULL,
  notice_period_days INTEGER NULL CHECK (notice_period_days IS NULL OR notice_period_days >= 0),
  work_authorization_status TEXT NULL,
  requires_sponsorship BOOLEAN NULL,
  willing_to_relocate BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_profile_personal_updated_at ON public.profile_personal;
CREATE TRIGGER set_profile_personal_updated_at
  BEFORE UPDATE ON public.profile_personal
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 2. TABLE: experiences
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employment_type TEXT NULL,
  location TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_experiences_dates CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_experiences_current CHECK (NOT (is_current = TRUE AND end_date IS NOT NULL))
);

DROP TRIGGER IF EXISTS set_experiences_updated_at ON public.experiences;
CREATE TRIGGER set_experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. TABLE: education
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NULL,
  field_of_study TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  grade TEXT NULL,
  location TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_education_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

DROP TRIGGER IF EXISTS set_education_updated_at ON public.education;
CREATE TRIGGER set_education_updated_at
  BEFORE UPDATE ON public.education
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. TABLE: skills
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency TEXT NULL,
  years_experience NUMERIC(4,1) NULL CHECK (years_experience IS NULL OR years_experience >= 0),
  last_used_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_user_skill_name_lower
  ON public.skills (user_id, LOWER(skill_name));

DROP TRIGGER IF EXISTS set_skills_updated_at ON public.skills;
CREATE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. TABLE: certifications
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NULL,
  credential_id TEXT NULL,
  issue_date DATE NULL,
  expiry_date DATE NULL,
  verification_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_certifications_dates CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

DROP TRIGGER IF EXISTS set_certifications_updated_at ON public.certifications;
CREATE TRIGGER set_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. TABLE: languages
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  proficiency TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_languages_user_language_lower
  ON public.languages (user_id, LOWER(language));

DROP TRIGGER IF EXISTS set_languages_updated_at ON public.languages;
CREATE TRIGGER set_languages_updated_at
  BEFORE UPDATE ON public.languages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. TABLE: profile_links
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('LINKEDIN', 'GITHUB', 'PORTFOLIO', 'STACKOVERFLOW', 'OTHER')),
  url TEXT NOT NULL,
  label TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_profile_links_updated_at ON public.profile_links;
CREATE TRIGGER set_profile_links_updated_at
  BEFORE UPDATE ON public.profile_links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. TABLE: profile_preferences
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profile_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  remote_preference TEXT NULL,
  preferred_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  employment_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_industries JSONB NOT NULL DEFAULT '[]'::jsonb,
  minimum_expected_ctc NUMERIC(12,2) NULL CHECK (minimum_expected_ctc IS NULL OR minimum_expected_ctc >= 0),
  preferred_currency TEXT NULL,
  willing_to_relocate BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_profile_preferences_updated_at ON public.profile_preferences;
CREATE TRIGGER set_profile_preferences_updated_at
  BEFORE UPDATE ON public.profile_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. TABLE: documents (Metadata table pointing to user-documents storage bucket)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('RESUME', 'COVER_LETTER', 'CERTIFICATE', 'PORTFOLIO', 'OTHER')),
  category TEXT NOT NULL CHECK (category IN ('resumes', 'cover-letters', 'certificates', 'portfolio', 'other')),
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_documents_id_user_id UNIQUE (id, user_id),
  CONSTRAINT chk_documents_storage_path CHECK (
    storage_path ~ '^[0-9a-fA-F-]{36}/(resumes|cover-letters|certificates|portfolio|other)/.+$'
    AND (split_part(storage_path, '/', 1))::uuid = user_id
    AND split_part(storage_path, '/', 2) = category
  )
);

DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 10. TABLE: portals (Global reference catalog)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('JOB_PORTAL', 'COMPANY_SITE')),
  base_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_portals_updated_at ON public.portals;
CREATE TRIGGER set_portals_updated_at
  BEFORE UPDATE ON public.portals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 11. TABLE: jobs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_id UUID NULL REFERENCES public.portals(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT NULL,
  location TEXT NULL,
  employment_type TEXT NULL,
  description TEXT NULL,
  salary_min NUMERIC(12,2) NULL CHECK (salary_min IS NULL OR salary_min >= 0),
  salary_max NUMERIC(12,2) NULL CHECK (salary_max IS NULL OR salary_max >= 0),
  currency TEXT NULL,
  posted_at TIMESTAMPTZ NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'SAVED' CHECK (status IN ('SAVED', 'INTERESTED', 'APPLIED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_jobs_id_user_id UNIQUE (id, user_id),
  CONSTRAINT chk_jobs_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

DROP TRIGGER IF EXISTS set_jobs_updated_at ON public.jobs;
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. TABLE: applications (Composite FKs ensure job & documents belong to same user)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('SAVED', 'INTERESTED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN')),
  applied_at TIMESTAMPTZ NULL,
  submitted_at TIMESTAMPTZ NULL,
  resume_document_id UUID NULL,
  cover_letter_document_id UUID NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_applications_id_user_id UNIQUE (id, user_id),
  CONSTRAINT fk_applications_job_user FOREIGN KEY (job_id, user_id)
    REFERENCES public.jobs(id, user_id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_resume_user FOREIGN KEY (resume_document_id, user_id)
    REFERENCES public.documents(id, user_id) ON DELETE SET NULL,
  CONSTRAINT fk_applications_cover_letter_user FOREIGN KEY (cover_letter_document_id, user_id)
    REFERENCES public.documents(id, user_id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 13. TABLE: answer_bank
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.answer_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_key TEXT NOT NULL,
  question_pattern TEXT NULL,
  canonical_answer TEXT NOT NULL CHECK (LENGTH(TRIM(canonical_answer)) > 0),
  answer_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (answer_type IN ('TEXT', 'BOOLEAN', 'NUMBER', 'DATE', 'URL')),
  sensitivity TEXT NOT NULL DEFAULT 'NORMAL' CHECK (sensitivity IN ('NORMAL', 'SENSITIVE', 'NEVER_AUTOFILL')),
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_answer_bank_user_concept UNIQUE (user_id, concept_key)
);

DROP TRIGGER IF EXISTS set_answer_bank_updated_at ON public.answer_bank;
CREATE TRIGGER set_answer_bank_updated_at
  BEFORE UPDATE ON public.answer_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 14. TABLE: application_answers (Composite FK ensures application belongs to same user)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL,
  concept_key TEXT NULL,
  question_text TEXT NOT NULL,
  answer_value TEXT NULL,
  answer_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (answer_type IN ('TEXT', 'BOOLEAN', 'NUMBER', 'DATE', 'URL')),
  source_type TEXT NOT NULL DEFAULT 'USER' CHECK (source_type IN ('USER', 'PROFILE', 'ANSWER_BANK', 'AI_GENERATED')),
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_application_answers_app_user FOREIGN KEY (application_id, user_id)
    REFERENCES public.applications(id, user_id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS set_application_answers_updated_at ON public.application_answers;
CREATE TRIGGER set_application_answers_updated_at
  BEFORE UPDATE ON public.application_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 15. INDEXES FOR COMMON QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profile_personal_user_id ON public.profile_personal(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON public.experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_user_current ON public.experiences(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_education_user_id ON public.education(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON public.skills(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON public.certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_languages_user_id ON public.languages(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_links_user_id ON public.profile_links(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_preferences_user_id ON public.profile_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON public.documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_user_category ON public.documents(user_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_user_active ON public.documents(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON public.jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_portal_id ON public.jobs(portal_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON public.applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_answer_bank_user_id ON public.answer_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_application_answers_user_id ON public.application_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_application_answers_app_id ON public.application_answers(application_id);

-- ==============================================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- A. User-Owned Tables
ALTER TABLE public.profile_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_answers ENABLE ROW LEVEL SECURITY;

-- Helper macro for standard user-owned policies
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profile_personal', 'experiences', 'education', 'skills',
    'certifications', 'languages', 'profile_links', 'profile_preferences',
    'documents', 'jobs', 'applications', 'answer_bank', 'application_answers'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_policy" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_select_policy" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_policy" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_insert_policy" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%s_update_policy" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_update_policy" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_policy" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_delete_policy" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id);', tbl, tbl);
  END LOOP;
END $$;

-- B. Global Reference Table: portals
ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portals_read_policy" ON public.portals;
CREATE POLICY "portals_read_policy"
  ON public.portals
  FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 17. TABLE PRIVILEGE GRANTS
-- ==============================================================================
-- User-owned tables: Authenticated gets full CRUD; Anonymous gets zero access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_personal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.languages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answer_bank TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_answers TO authenticated;

REVOKE ALL ON public.profile_personal FROM anon;
REVOKE ALL ON public.experiences FROM anon;
REVOKE ALL ON public.education FROM anon;
REVOKE ALL ON public.skills FROM anon;
REVOKE ALL ON public.certifications FROM anon;
REVOKE ALL ON public.languages FROM anon;
REVOKE ALL ON public.profile_links FROM anon;
REVOKE ALL ON public.profile_preferences FROM anon;
REVOKE ALL ON public.documents FROM anon;
REVOKE ALL ON public.jobs FROM anon;
REVOKE ALL ON public.applications FROM anon;
REVOKE ALL ON public.answer_bank FROM anon;
REVOKE ALL ON public.application_answers FROM anon;

-- Portals table: Authenticated gets SELECT only; Anonymous gets zero access; normal client writes revoked
GRANT SELECT ON public.portals TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.portals FROM authenticated;
REVOKE ALL ON public.portals FROM anon;

-- ==============================================================================
-- 18. SEED DATA: PORTALS CATALOG (7 APPROVED PORTALS)
-- ==============================================================================
INSERT INTO public.portals (code, name, portal_type, base_url, is_active)
VALUES
  ('LINKEDIN', 'LinkedIn', 'JOB_PORTAL', 'https://www.linkedin.com', true),
  ('NAUKRI', 'Naukri', 'JOB_PORTAL', 'https://www.naukri.com', true),
  ('INDEED', 'Indeed', 'JOB_PORTAL', 'https://www.indeed.com', true),
  ('WELLFOUND', 'Wellfound', 'JOB_PORTAL', 'https://wellfound.com', true),
  ('HIRIST', 'Hirist', 'JOB_PORTAL', 'https://www.hirist.tech', true),
  ('UNSTOP', 'Unstop', 'JOB_PORTAL', 'https://unstop.com', true),
  ('COMPANY_SITE', 'Company Careers Site', 'COMPANY_SITE', NULL, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  portal_type = EXCLUDED.portal_type,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active;
