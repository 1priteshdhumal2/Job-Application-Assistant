-- ==============================================================================
-- JobPilot Phase 2C-2 Migration 00005: Harden Domain Schema, Lifecycle & State
-- ==============================================================================

-- 1. Applications Soft-Delete
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_applications_user_active
  ON public.applications (user_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_applications_user_deleted
  ON public.applications (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;


-- 2. Documents Logical Group Identity & Single-Active-Version Constraint
-- ------------------------------------------------------------------------------
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_group_id UUID NULL;

-- Ensure all existing Phase 2C-1 documents satisfy document_group_id = id
UPDATE public.documents
  SET document_group_id = id
  WHERE document_group_id IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN document_group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN document_group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_user_group
  ON public.documents (user_id, document_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_group_active
  ON public.documents (document_group_id)
  WHERE is_active = TRUE;


-- 3. Application Answers Immutability Hardening
-- ------------------------------------------------------------------------------
-- Revoke mutation privileges from normal authenticated clients
REVOKE UPDATE, DELETE ON public.application_answers FROM authenticated;
REVOKE ALL ON public.application_answers FROM anon;

-- Drop existing mutation RLS policies from 00004
DROP POLICY IF EXISTS "application_answers_update_policy" ON public.application_answers;
DROP POLICY IF EXISTS "application_answers_delete_policy" ON public.application_answers;
DROP POLICY IF EXISTS "Users can update their own application answers" ON public.application_answers;
DROP POLICY IF EXISTS "Users can delete their own application answers" ON public.application_answers;

-- Create unconditional mutation blocker trigger function
CREATE OR REPLACE FUNCTION public.prevent_application_answer_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Application answers are immutable historical snapshots and cannot be modified or deleted.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_application_answer_mutation ON public.application_answers;
CREATE TRIGGER trg_prevent_application_answer_mutation
BEFORE UPDATE OR DELETE ON public.application_answers
FOR EACH ROW EXECUTE FUNCTION public.prevent_application_answer_mutation();


-- 4. Atomic Application Status Transition RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_application_status(
  p_application_id UUID,
  p_to_status TEXT
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_app public.applications%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
BEGIN
  -- Verify authenticated session
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  -- 1. Acquire row lock and verify active ownership
  SELECT * INTO v_app
  FROM public.applications
  WHERE id = p_application_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Evaluate state machine (Same status is an idempotent successful no-op)
  IF v_app.status = p_to_status THEN
    RETURN v_app;
  END IF;

  CASE v_app.status
    WHEN 'SAVED' THEN
      v_allowed := p_to_status IN ('INTERESTED', 'APPLIED', 'REJECTED', 'WITHDRAWN');
    WHEN 'INTERESTED' THEN
      v_allowed := p_to_status IN ('APPLIED', 'REJECTED', 'WITHDRAWN');
    WHEN 'APPLIED' THEN
      v_allowed := p_to_status IN ('ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');
    WHEN 'ASSESSMENT' THEN
      v_allowed := p_to_status IN ('INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');
    WHEN 'INTERVIEW' THEN
      v_allowed := p_to_status IN ('OFFER', 'REJECTED', 'WITHDRAWN');
    WHEN 'OFFER' THEN
      v_allowed := p_to_status IN ('REJECTED', 'WITHDRAWN');
    ELSE
      -- REJECTED and WITHDRAWN are terminal
      v_allowed := FALSE;
  END CASE;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition from % to %', v_app.status, p_to_status
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Perform atomic update with timestamp tracking
  UPDATE public.applications
  SET 
    status = p_to_status,
    applied_at = CASE WHEN p_to_status = 'APPLIED' AND applied_at IS NULL THEN NOW() ELSE applied_at END,
    submitted_at = CASE WHEN p_to_status IN ('APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER') AND submitted_at IS NULL THEN NOW() ELSE submitted_at END,
    updated_at = NOW()
  WHERE id = p_application_id
  RETURNING * INTO v_app;

  RETURN v_app;
END;
$$;


-- 5. Atomic Document Version Creation RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_document_version(
  p_document_group_id UUID,
  p_name TEXT,
  p_storage_path TEXT,
  p_mime_type TEXT,
  p_file_size BIGINT,
  p_document_type TEXT,
  p_category TEXT
)
RETURNS public.documents
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_group_owner UUID;
  v_current_active public.documents%ROWTYPE;
  v_next_version INT := 1;
  v_new_doc public.documents%ROWTYPE;
BEGIN
  -- Verify authenticated session
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  -- 1. Verify group ownership if group already exists
  SELECT user_id INTO v_group_owner
  FROM public.documents
  WHERE document_group_id = p_document_group_id
  LIMIT 1;

  IF FOUND AND v_group_owner != auth.uid() THEN
    RAISE EXCEPTION 'CROSS_TENANT_DOCUMENT_GROUP_VIOLATION' USING ERRCODE = '42501';
  END IF;

  -- 2. Lock current active version if present
  SELECT * INTO v_current_active
  FROM public.documents
  WHERE document_group_id = p_document_group_id
    AND user_id = auth.uid()
    AND is_active = TRUE
  FOR UPDATE;

  IF FOUND THEN
    v_next_version := v_current_active.version + 1;
    -- Deactivate current active version
    UPDATE public.documents
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = v_current_active.id;
  ELSE
    -- If no active version exists, find max version so far for this group
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.documents
    WHERE document_group_id = p_document_group_id
      AND user_id = auth.uid();
  END IF;

  -- 3. Insert new active version
  INSERT INTO public.documents (
    user_id,
    document_group_id,
    document_type,
    category,
    name,
    storage_path,
    mime_type,
    file_size,
    version,
    is_active
  ) VALUES (
    auth.uid(),
    p_document_group_id,
    p_document_type,
    p_category,
    p_name,
    p_storage_path,
    p_mime_type,
    p_file_size,
    v_next_version,
    TRUE
  ) RETURNING * INTO v_new_doc;

  RETURN v_new_doc;
END;
$$;


-- 6. RPC Function Privileges
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.transition_application_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_document_version(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.transition_application_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_document_version(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.transition_application_status(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_document_version(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) FROM anon;


-- 7. Integration Test Auth Users
-- ------------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'test_user_a@jobpilot.internal',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(), NOW(), '', '', '', ''
), (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'test_user_b@jobpilot.internal',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(), NOW(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;
