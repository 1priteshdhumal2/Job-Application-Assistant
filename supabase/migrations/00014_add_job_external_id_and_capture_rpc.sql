-- ==============================================================================
-- Migration: 00014_add_job_external_id_and_capture_rpc.sql
-- Description: Adds external_job_id to public.jobs, unique constraints for portal job identity
--              and 1-to-1 application ownership, and implements public.capture_portal_job RPC.
-- ==============================================================================

-- 1. Add external_job_id column to public.jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS external_job_id TEXT NULL;

-- 2. Partial unique index on jobs (user_id, portal_id, external_job_id)
-- Allows manual jobs (external_job_id IS NULL) to coexist without uniqueness collision
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_user_portal_external_id
  ON public.jobs (user_id, portal_id, external_job_id)
  WHERE external_job_id IS NOT NULL;

-- 3. Clean up historical duplicate applications before creating unique index
-- Preserves the single authoritative application (active preferred, latest updated)
DELETE FROM public.applications a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (user_id, job_id) id
  FROM public.applications
  ORDER BY user_id, job_id, (deleted_at IS NULL) DESC, updated_at DESC, created_at DESC
);

-- 4. Unique index on applications (user_id, job_id) covering active and archived rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_user_job
  ON public.applications (user_id, job_id);

-- 5. Atomic Ingestion RPC: capture_portal_job
CREATE OR REPLACE FUNCTION public.capture_portal_job(
  p_portal_code TEXT,
  p_external_job_id TEXT,
  p_job_title TEXT,
  p_company_name TEXT,
  p_job_url TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_captured_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID := auth.uid();
  v_user_id UUID;
  v_portal_id UUID;
  v_job public.jobs%ROWTYPE;
  v_app public.applications%ROWTYPE;
  v_is_new_job BOOLEAN := false;
  v_application_created BOOLEAN := false;
  v_application_restored BOOLEAN := false;
BEGIN
  -- 1. Verify authenticated session & user identity
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_user_id := COALESCE(p_user_id, v_auth_user_id);

  IF v_user_id != v_auth_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User identity mismatch' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate required capture parameters
  IF p_portal_code IS NULL OR TRIM(p_portal_code) = '' THEN
    RAISE EXCEPTION 'PORTAL_CODE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_external_job_id IS NULL OR TRIM(p_external_job_id) = '' THEN
    RAISE EXCEPTION 'EXTERNAL_JOB_ID_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_job_title IS NULL OR TRIM(p_job_title) = '' THEN
    RAISE EXCEPTION 'JOB_TITLE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_company_name IS NULL OR TRIM(p_company_name) = '' THEN
    RAISE EXCEPTION 'COMPANY_NAME_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_job_url IS NULL OR TRIM(p_job_url) = '' THEN
    RAISE EXCEPTION 'JOB_URL_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Resolve active portal by code
  SELECT id INTO v_portal_id
  FROM public.portals
  WHERE UPPER(code) = UPPER(TRIM(p_portal_code))
    AND is_active = true;

  IF v_portal_id IS NULL THEN
    RAISE EXCEPTION 'PORTAL_NOT_FOUND_OR_INACTIVE: Portal % not found or inactive', p_portal_code
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Atomic PostgreSQL-native Job Upsert
  -- Handles concurrent first captures safely via ON CONFLICT against the partial unique index
  INSERT INTO public.jobs (
    user_id,
    portal_id,
    external_job_id,
    job_title,
    company_name,
    job_url,
    location,
    description,
    captured_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_portal_id,
    TRIM(p_external_job_id),
    TRIM(p_job_title),
    TRIM(p_company_name),
    TRIM(p_job_url),
    TRIM(p_location),
    TRIM(p_description),
    COALESCE(p_captured_at, timezone('utc', now())),
    'SAVED',
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (user_id, portal_id, external_job_id) WHERE external_job_id IS NOT NULL
  DO UPDATE SET
    job_title = EXCLUDED.job_title,
    company_name = EXCLUDED.company_name,
    job_url = COALESCE(EXCLUDED.job_url, public.jobs.job_url),
    location = COALESCE(EXCLUDED.location, public.jobs.location),
    description = COALESCE(EXCLUDED.description, public.jobs.description),
    captured_at = EXCLUDED.captured_at,
    updated_at = timezone('utc', now())
  RETURNING * INTO v_job;

  IF v_job.created_at = v_job.updated_at THEN
    v_is_new_job := true;
  ELSE
    v_is_new_job := false;
  END IF;

  -- 5. Atomic Application Resolution / Restore / Creation
  SELECT * INTO v_app
  FROM public.applications
  WHERE user_id = v_user_id
    AND job_id = v_job.id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.applications (
      user_id,
      job_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_job.id,
      'SAVED',
      timezone('utc', now()),
      timezone('utc', now())
    )
    ON CONFLICT (user_id, job_id)
    DO UPDATE SET
      deleted_at = NULL,
      updated_at = CASE 
        WHEN public.applications.deleted_at IS NOT NULL THEN timezone('utc', now())
        ELSE public.applications.updated_at
      END
    RETURNING * INTO v_app;

    IF v_app.created_at = v_app.updated_at THEN
      v_application_created := true;
    ELSE
      v_application_restored := true;
    END IF;
  ELSE
    IF v_app.deleted_at IS NOT NULL THEN
      UPDATE public.applications
      SET deleted_at = NULL,
          updated_at = timezone('utc', now())
      WHERE id = v_app.id
      RETURNING * INTO v_app;
      v_application_restored := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'job', to_jsonb(v_job),
    'application', to_jsonb(v_app),
    'is_new_job', v_is_new_job,
    'application_created', v_application_created,
    'application_restored', v_application_restored
  );
END;
$$;

-- 6. Update prepare_application stored function to align with 1-to-1 application uniqueness
CREATE OR REPLACE FUNCTION public.prepare_application(
  p_application_id UUID,
  p_job_id UUID,
  p_resume_document_id UUID,
  p_cover_letter_document_id UUID,
  p_notes TEXT,
  p_status TEXT,
  p_idempotency_key UUID,
  p_answers JSONB
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
    IF p_application_id IS NOT NULL AND v_existing_prep.original_application_id != p_application_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_APPLICATION_MISMATCH' USING ERRCODE = 'P0003';
    END IF;

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
        id, user_id, job_id, status, notes,
        resume_document_id, cover_letter_document_id
      ) VALUES (
        p_application_id, v_user_id, p_job_id, v_target_status, p_notes,
        p_resume_document_id, p_cover_letter_document_id
      )
      ON CONFLICT (user_id, job_id)
      DO UPDATE SET updated_at = public.applications.updated_at
      RETURNING * INTO v_app;
    ELSE
      IF v_app.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'APPLICATION_IS_ARCHIVED' USING ERRCODE = 'P0001';
      END IF;

      IF v_app.status IN ('REJECTED', 'WITHDRAWN') THEN
        RAISE EXCEPTION 'APPLICATION_IS_TERMINAL' USING ERRCODE = 'P0001';
      END IF;

      v_job_id := v_app.job_id;
      v_target_status := v_app.status;
    END IF;
  ELSE
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

    SELECT * INTO v_app
    FROM public.applications
    WHERE user_id = v_user_id AND job_id = p_job_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_app.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'APPLICATION_IS_ARCHIVED' USING ERRCODE = 'P0001';
      END IF;

      IF v_app.status IN ('REJECTED', 'WITHDRAWN') THEN
        RAISE EXCEPTION 'APPLICATION_IS_TERMINAL' USING ERRCODE = 'P0001';
      END IF;

      v_job_id := v_app.job_id;
      v_target_status := v_app.status;
    ELSE
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
      )
      ON CONFLICT (user_id, job_id)
      DO UPDATE SET updated_at = public.applications.updated_at
      RETURNING * INTO v_app;
    END IF;
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

  -- 5. Calculate Preparation Number
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
