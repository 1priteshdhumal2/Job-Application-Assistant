-- ==============================================================================
-- Migration: 00009_update_prepare_application_rpc.sql
-- Description: Updates public.prepare_application stored function with canonical
--              payload hash computation across initial check, insert, and concurrent race handler.
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

      IF v_app.status IN ('REJECTED', 'WITHDRAWN') THEN
        RAISE EXCEPTION 'APPLICATION_IS_TERMINAL' USING ERRCODE = 'P0001';
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
