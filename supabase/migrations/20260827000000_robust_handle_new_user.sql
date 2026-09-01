-- ================================================================
-- Robust handle_new_user() trigger function
-- Creates a profiles row for every new auth.users row
-- Safe, idempotent, never fails on username conflicts
-- ================================================================

-- 1. Replace the trigger function (safe — does not touch any data)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name  text;
  v_email      text;
  v_username   text;        -- raw requested username
  v_final      text;        -- the username we will actually use
  v_suffix     text;        -- 8-char hex from UUID for fallback
  v_attempt    int := 0;
BEGIN
  -- ── Extract values from the auth user row ────────────────────
  v_email     := NEW.email;
  v_full_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  v_username  := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'username', '')));

  -- ── Sanitize: keep only a-z 0-9 _ . - ──────────────────────
  v_username := regexp_replace(v_username, '[^a-z0-9_.\-]', '', 'g');

  -- ── Try the requested username ───────────────────────────────
  IF
    length(v_username) >= 3
    AND length(v_username) <= 24
    AND v_username ~ '^[a-z0-9][a-z0-9_.\-]*[a-z0-9]$'
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username)
  THEN
    v_final := v_username;
  END IF;

  -- ── Fallback: generate from UUID (guaranteed unique pattern) ─
  IF v_final IS NULL THEN
    -- Take first 8 hex chars of the UUID (no dashes)
    v_suffix := replace(NEW.id::text, '-', '');
    v_suffix := substring(v_suffix FROM 1 FOR 8);
    v_final  := 'user_' || v_suffix;                         -- 13 chars

    -- Resolve any collision (extremely unlikely)
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final) LOOP
      v_attempt := v_attempt + 1;
      v_final   := 'user_' || v_suffix || '_' || v_attempt;  -- e.g. user_ab12cd34_1
    END LOOP;
  END IF;

  -- ── Insert the profile (idempotent) ──────────────────────────
  -- ON CONFLICT: if a row already exists (e.g. from an older trigger
  -- that ran before this migration), do nothing — never crash.
  INSERT INTO public.profiles (
    id, email, full_name, username, role, avatar_color
  ) VALUES (
    NEW.id,
    v_email,
    COALESCE(NULLIF(v_full_name, ''), split_part(v_email, '@', 1)),
    v_final,
    'buyer',
    '#0d7d76'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Drop any existing trigger to prevent duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger (fires AFTER INSERT on auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
