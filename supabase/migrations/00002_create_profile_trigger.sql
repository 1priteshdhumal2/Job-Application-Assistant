-- ==============================================================================
-- Migration: 00002_create_profile_trigger.sql
-- Description: Creates the secure database trigger on auth.users to automatically
--              create a public.profiles row upon user registration (Email or OAuth).
-- ==============================================================================

-- 1. Create the secure trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract display name with strict precedence: full_name -> name -> email local-part -> NULL
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_display_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    );
  END IF;

  IF v_display_name IS NULL AND NEW.email IS NOT NULL THEN
    v_display_name := split_part(NEW.email, '@', 1);
  END IF;

  -- Extract avatar URL with strict precedence: avatar_url -> picture -> NULL
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    v_avatar_url := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    );
  END IF;

  -- Insert profile row safely without duplicating
  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_url,
    onboarding_status
  ) VALUES (
    NEW.id,
    v_display_name,
    v_avatar_url,
    'NOT_STARTED'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log warning and continue to not block core authentication if trigger fails
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Revoke direct execution privileges from PUBLIC, anon, and authenticated roles
-- (The trigger executes under SECURITY DEFINER / table owner, but direct RPC is denied)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

