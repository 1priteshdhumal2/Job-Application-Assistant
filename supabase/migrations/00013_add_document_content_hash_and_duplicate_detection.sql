-- ==============================================================================
-- JobPilot Phase 2D-2C-3A Migration 00013: Document Content Hash & Duplicate Detection
-- ==============================================================================

-- 1. Add content_hash column to public.documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT NULL;

-- 2. Add format check constraint for SHA-256 (64-character lowercase/uppercase hex string)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_content_hash'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT chk_documents_content_hash
      CHECK (content_hash IS NULL OR content_hash ~ '^[0-9a-fA-F]{64}$');
  END IF;
END $$;

-- 3. Add per-user uniqueness index on (user_id, content_hash)
-- Allows multiple NULL values for legacy records without content_hash,
-- but enforces strict uniqueness per user for populated SHA-256 hashes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_user_content_hash
  ON public.documents (user_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- 4. Drop legacy 7-parameter function overload and recreate create_document_version with content_hash
DROP FUNCTION IF EXISTS public.create_document_version(UUID, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_document_version(
  p_document_group_id UUID,
  p_name TEXT,
  p_storage_path TEXT,
  p_mime_type TEXT,
  p_file_size BIGINT,
  p_document_type TEXT,
  p_category TEXT,
  p_content_hash TEXT DEFAULT NULL
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
    content_hash,
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
    p_content_hash,
    v_next_version,
    TRUE
  ) RETURNING * INTO v_new_doc;

  RETURN v_new_doc;
END;
$$;
