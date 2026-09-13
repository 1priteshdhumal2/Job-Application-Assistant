-- ==============================================================================
-- Migration: 00012_reconcile_composite_fk_set_null_columns.sql
-- Description: Reconciles composite foreign key constraints on application_preparations
--              and application_answers to specify ON DELETE SET NULL (application_id).
--              Ensures parent application hard-deletion nullifies ONLY application_id
--              while preserving tenant user_id, satisfying immutability triggers and RLS.
-- ==============================================================================

-- 1. Reconcile fk_app_prep_app on application_preparations
ALTER TABLE public.application_preparations
  DROP CONSTRAINT IF EXISTS fk_app_prep_app;

ALTER TABLE public.application_preparations
  ADD CONSTRAINT fk_app_prep_app
  FOREIGN KEY (application_id, user_id)
  REFERENCES public.applications(id, user_id)
  ON DELETE SET NULL (application_id);

-- 2. Reconcile fk_app_answers_app_user on application_answers
ALTER TABLE public.application_answers
  DROP CONSTRAINT IF EXISTS fk_app_answers_app_user;

ALTER TABLE public.application_answers
  ADD CONSTRAINT fk_app_answers_app_user
  FOREIGN KEY (application_id, user_id)
  REFERENCES public.applications(id, user_id)
  ON DELETE SET NULL (application_id);
