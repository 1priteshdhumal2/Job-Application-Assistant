-- ==============================================================================
-- Migration: 00011_enforce_pre_submission_preparation.sql
-- Description: Updates public.prepare_application stored function to strictly
--              enforce that preparation is pre-submission only.
--              Preparation is allowed ONLY when an application has status
--              'SAVED' or 'INTERESTED'.
--              Preparation is strictly BLOCKED when status is 'APPLIED',
--              'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN',
--              or when the application is archived.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prepare_application(
  p_application_id UUID,          -- Client UUID for new app, or existing UUID
  p_job_id UUID,                  -- Required if creating new app
  p_resume_document_id UUID,      -- Nullable
  p_cover_letter_document_id UUID,-- Nullable
  p_notes TEXT,                   -- Nullable
  p_status TEXT,                  -- Optional requested status ('SAVED' or 'INTERESTED')
  p_idempotency_key UUID,         -- Client-generated intent key
  p_answers JSONB                 -- Array of { concept_key, question_text, answer_value, answer_type, source_type, requires_review }
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_app public.applications%ROWTYPE;
  v_existing_prep public.application_preparations%ROWTYPE;
  v_job_id UUID;
  v_target_status TEXT;
  v_payload_hash TEXT;
  v_prep_num INT := 1;
  v_new_prep public.application_preparations%ROWTYPE;
BEGIN
  -- 1. Verify authenticated session
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Check for existing preparation with this idempotency key
  SELECT * INTO v_existing_prep
  FROM public.application_preparations
  WHERE user_id = v_user_id
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Check if client provided a conflicting application ID
    IF p_application_id IS NOT NULL AND v_existing_prep.original_application_id != p_application_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_APPLICATION_MISMATCH' USING ERRCODE = 'P0003';
    END IF;

    -- Compute expected payload hash against existing preparation's entity identity
    v_payload_hash := md5(
      v_existing_prep.job_id::text || ':' ||
      v_existing_prep.original_application_id::text || ':' ||
      COALESCE(p_resume_document_id::text, '') || ':' ||
      COALESCE(p_cover_letter_document_id::text, '') || ':' ||
      COALESCE(p_notes, '') || ':' ||
      COALESCE(p_answers::text, '[]')
    );

    IF v_existing_prep.payload_hash != v_payload_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0003';
    END IF;

    -- Return existing active application
    SELECT * INTO v_app
    FROM public.applications
    WHERE id = v_existing_prep.original_application_id
      AND user_id = v_user_id
      AND deleted_at IS NULL;

    IF v_app.id IS NOT NULL THEN
      RETURN v_app;
    ELSE
      RAISE EXCEPTION 'APPLICATION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 3. Resolve Application (Existing vs New)
  IF p_application_id IS NOT NULL THEN
    SELECT * INTO v_app
    FROM public.applications
    WHERE id = p_application_id
      AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- New application with client-provided UUID
      IF p_job_id IS NULL THEN
        RAISE EXCEPTION 'JOB_ID_REQUIRED_FOR_NEW_APPLICATION' USING ERRCODE = 'P0001';
      END IF;

      -- Verify Job ownership
      SELECT id INTO v_job_id
      FROM public.jobs
      WHERE id = p_job_id AND user_id = v_user_id
      FOR SHARE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
      END IF;

      v_target_status := COALESCE(p_status, 'SAVED');
      IF v_target_status NOT IN ('SAVED', 'INTERESTED') THEN
        RAISE EXCEPTION 'INVALID_INITIAL_STATUS: %', v_target_status USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO public.applications (
        id, user_id, job_id, status, notes,
        resume_document_id, cover_letter_document_id
      ) VALUES (
        p_application_id, v_user_id, p_job_id, v_target_status, p_notes,
        p_resume_document_id, p_cover_letter_document_id
      ) RETURNING * INTO v_app;
    ELSE
      -- Existing application found
      IF v_app.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'APPLICATION_IS_ARCHIVED' USING ERRCODE = 'P0001';
      END IF;

      -- Strict pre-submission preparation enforcement
      IF v_app.status NOT IN ('SAVED', 'INTERESTED') THEN
        RAISE EXCEPTION 'APPLICATION_STATUS_NOT_PREPARABLE: %', v_app.status USING ERRCODE = 'P0001';
      END IF;

      v_job_id := v_app.job_id;
      v_target_status := v_app.status; -- Preserve existing status
    END IF;
  ELSE
    -- New application without client-provided UUID
    IF p_job_id IS NULL THEN
      RAISE EXCEPTION 'JOB_ID_REQUIRED_FOR_NEW_APPLICATION' USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_job_id
    FROM public.jobs
    WHERE id = p_job_id AND user_id = v_user_id
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    v_target_status := COALESCE(p_status, 'SAVED');
    IF v_target_status NOT IN ('SAVED', 'INTERESTED') THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS: %', v_target_status USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.applications (
      user_id, job_id, status, notes,
      resume_document_id, cover_letter_document_id
    ) VALUES (
      v_user_id, p_job_id, v_target_status, p_notes,
      p_resume_document_id, p_cover_letter_document_id
    ) RETURNING * INTO v_app;
  END IF;

  -- 4. Document Category & Active State Verification (FOR SHARE)
  IF p_resume_document_id IS NOT NULL THEN
    PERFORM 1 FROM public.documents
    WHERE id = p_resume_document_id
      AND user_id = v_user_id
      AND is_active = TRUE
      AND category = 'resumes'
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_OR_INACTIVE_RESUME' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_cover_letter_document_id IS NOT NULL THEN
    PERFORM 1 FROM public.documents
    WHERE id = p_cover_letter_document_id
      AND user_id = v_user_id
      AND is_active = TRUE
      AND category = 'cover-letters'
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_OR_INACTIVE_COVER_LETTER' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 5. Calculate Preparation Number (Serialized by application FOR UPDATE lock)
  SELECT COALESCE(MAX(preparation_number), 0) + 1 INTO v_prep_num
  FROM public.application_preparations
  WHERE original_application_id = v_app.id
    AND user_id = v_user_id;

  -- 6. Compute Canonical Payload Hash
  v_payload_hash := md5(
    v_job_id::text || ':' ||
    v_app.id::text || ':' ||
    COALESCE(p_resume_document_id::text, '') || ':' ||
    COALESCE(p_cover_letter_document_id::text, '') || ':' ||
    COALESCE(p_notes, '') || ':' ||
    COALESCE(p_answers::text, '[]')
  );

  -- 7. Insert Preparation Record
  BEGIN
    INSERT INTO public.application_preparations (
      user_id, job_id, application_id, original_application_id,
      preparation_number, resume_document_id, cover_letter_document_id,
      notes, status, idempotency_key, payload_hash
    ) VALUES (
      v_user_id, v_job_id, v_app.id, v_app.id,
      v_prep_num, p_resume_document_id, p_cover_letter_document_id,
      p_notes, v_target_status, p_idempotency_key, v_payload_hash
    ) RETURNING * INTO v_new_prep;
  EXCEPTION WHEN unique_violation THEN
    -- Handle race condition where same idempotency_key was committed concurrently
    SELECT * INTO v_existing_prep
    FROM public.application_preparations
    WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      v_payload_hash := md5(
        v_existing_prep.job_id::text || ':' ||
        v_existing_prep.original_application_id::text || ':' ||
        COALESCE(p_resume_document_id::text, '') || ':' ||
        COALESCE(p_cover_letter_document_id::text, '') || ':' ||
        COALESCE(p_notes, '') || ':' ||
        COALESCE(p_answers::text, '[]')
      );

      IF v_existing_prep.payload_hash != v_payload_hash THEN
        RAISE EXCEPTION 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH' USING ERRCODE = 'P0003';
      END IF;

      SELECT * INTO v_app
      FROM public.applications
      WHERE id = v_existing_prep.original_application_id
        AND user_id = v_user_id
        AND deleted_at IS NULL;

      RETURN v_app;
    ELSE
      RAISE;
    END IF;
  END;

  -- 8. Bulk Insert Answer Snapshots
  IF p_answers IS NOT NULL AND jsonb_array_length(p_answers) > 0 THEN
    INSERT INTO public.application_answers (
      user_id, preparation_id, application_id, concept_key,
      question_text, answer_value, answer_type, source_type, requires_review
    )
    SELECT
      v_user_id,
      v_new_prep.id,
      v_app.id,
      a->>'concept_key',
      COALESCE(a->>'question_text', ''),
      a->>'answer_value',
      COALESCE(a->>'answer_type', 'TEXT'),
      COALESCE(a->>'source_type', 'USER'),
      COALESCE((a->>'requires_review')::boolean, false)
    FROM jsonb_array_elements(p_answers) AS a;
  END IF;

  -- 9. Update Application's Latest Preparation Pointer & Document References
  UPDATE public.applications
  SET
    latest_preparation_id = v_new_prep.id,
    resume_document_id = p_resume_document_id,
    cover_letter_document_id = p_cover_letter_document_id,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = v_app.id
  RETURNING * INTO v_app;

  -- 10. Return Updated Application Row
  RETURN v_app;
END;
$$;

-- ==============================================================================
-- 2. RECONCILE IMMUTABILITY TRIGGERS FOR APPLICATION HARD-DELETE (SET NULL)
-- ==============================================================================
-- When an application is hard-deleted, foreign keys 'fk_app_prep_app' and
-- 'fk_app_answers_app_user' execute ON DELETE SET NULL. The triggers must permit
-- the application_id nullification while strictly rejecting any other update or delete.

CREATE OR REPLACE FUNCTION public.prevent_application_prep_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.application_id IS NOT NULL AND NEW.application_id IS NULL
       AND NEW.id = OLD.id
       AND NEW.user_id = OLD.user_id
       AND NEW.job_id = OLD.job_id
       AND NEW.original_application_id = OLD.original_application_id
       AND NEW.preparation_number = OLD.preparation_number
       AND (NEW.resume_document_id IS NOT DISTINCT FROM OLD.resume_document_id)
       AND (NEW.cover_letter_document_id IS NOT DISTINCT FROM OLD.cover_letter_document_id)
       AND (NEW.notes IS NOT DISTINCT FROM OLD.notes)
       AND NEW.status = OLD.status
       AND NEW.idempotency_key = OLD.idempotency_key
       AND NEW.payload_hash = OLD.payload_hash
       AND NEW.created_at = OLD.created_at THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Application preparations are immutable historical snapshots and cannot be modified or deleted.'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_application_answer_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.application_id IS NOT NULL AND NEW.application_id IS NULL
       AND NEW.id = OLD.id
       AND NEW.user_id = OLD.user_id
       AND NEW.preparation_id = OLD.preparation_id
       AND (NEW.concept_key IS NOT DISTINCT FROM OLD.concept_key)
       AND NEW.question_text = OLD.question_text
       AND (NEW.answer_value IS NOT DISTINCT FROM OLD.answer_value)
       AND NEW.answer_type = OLD.answer_type
       AND NEW.source_type = OLD.source_type
       AND NEW.requires_review = OLD.requires_review
       AND (NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at)
       AND NEW.created_at = OLD.created_at THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Application answers are immutable snapshots and cannot be modified or deleted.'
    USING ERRCODE = 'P0001';
END;
$$;

