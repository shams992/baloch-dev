-- ================================================================
-- CHECK EMAIL/USERNAME AVAILABILITY RPCs
--
-- After migration 002 restricts profiles reads to owner/admin,
-- the frontend can no longer check email/username availability
-- during signup (anonymous users). These SECURITY DEFINER functions
-- bypass RLS to allow pre-signup validation.
-- ================================================================

-- Check if an email is already registered
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = lower(trim(p_email))
  );
$$;

-- Check if a username is already taken
CREATE OR REPLACE FUNCTION public.check_username_exists(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(trim(p_username))
  );
$$;

-- Grant execute to anon and authenticated so signup can call these
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_username_exists(text) TO authenticated;
