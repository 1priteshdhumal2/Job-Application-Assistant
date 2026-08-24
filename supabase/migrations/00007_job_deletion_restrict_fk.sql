-- ==============================================================================
-- JobPilot Phase 2C-2 Migration 00007: Enforce Job Deletion Restrict Foreign Key
-- ==============================================================================

-- Replace ON DELETE CASCADE with ON DELETE RESTRICT on fk_applications_job_user
-- This prevents physical deletion of a job if any job applications reference it,
-- preserving all linked applications, document references, and immutable answer snapshots.

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS fk_applications_job_user;

ALTER TABLE public.applications
  ADD CONSTRAINT fk_applications_job_user
  FOREIGN KEY (job_id, user_id)
  REFERENCES public.jobs(id, user_id)
  ON DELETE RESTRICT;
