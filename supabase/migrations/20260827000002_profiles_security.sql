-- ================================================================
-- PROFILES SECURITY — Restrict sensitive fields from public access
--
-- PROBLEM: The current policy `using (true)` allows ANY user
-- (including anonymous) to read ALL profile columns, including:
--   email, phone, location, is_blocked
--
-- SOLUTION: Create a public_profiles view that exposes only safe
-- fields, and restrict the base profiles table to owner + admin.
--
-- TRADE-OFFS:
-- - Anonymous users lose the ability to read any profiles
-- - All profile reads must go through the view for public data
-- - The frontend needs to use 'public_profiles' for public-facing
--   profile data (seller names, avatars) and 'profiles' for own data
--
-- SAFETY: This does NOT delete any data. It only changes read access.
-- The view is additive — no existing data is removed.
-- ================================================================

-- 1. Create a public_profiles view with ONLY safe columns
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  avatar_color,
  role,
  bio,
  created_at
FROM public.profiles;

-- Grant read access to everyone (authenticated + anonymous)
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2. Drop the overly-permissive select policy
DROP POLICY IF EXISTS "profiles are readable" ON public.profiles;

-- 3. Replace with: only the owner and admins can read the full profile
CREATE POLICY "profiles readable by owner or admin" ON public.profiles
  FOR SELECT
  USING (id = auth.uid() OR public.my_role() = 'admin');

-- 4. Keep existing policies intact
-- "users update own profile" — already correct
-- "admins manage profiles" — already correct

-- ================================================================
-- FRONTEND MIGRATION GUIDE
-- ================================================================
-- After running this migration, update the frontend to:
--
-- 1. Public profile reads (seller pages, messaging counterpart):
--    Change: supabase.from('profiles').select('*')
--    To:     supabase.from('public_profiles').select('*')
--
-- 2. Own profile reads (auth, settings):
--    Keep:   supabase.from('profiles').select('*').eq('id', userId)
--    (owner can still read their own full profile)
--
-- 3. Admin reads:
--    Keep:   supabase.from('profiles').select('*')
--    (admin policy allows full read access)
--
-- 4. The following tables reference profiles.id via FK and are
--    unaffected by this change (RLS on profiles doesn't affect FK lookups):
--    orders, order_items, payments, reviews, messages, conversations,
--    notifications, addresses, cart_items, wishlist, seller_stores
-- ================================================================

-- ================================================================
-- NOTE: If you want to MINIMIZE frontend changes, an alternative
-- approach is to keep profiles readable by all authenticated users
-- (not anonymous). This still protects against anonymous scraping:
--
--   DROP POLICY IF EXISTS "profiles readable by owner or admin" ON public.profiles;
--   CREATE POLICY "profiles readable by authenticated" ON public.profiles
--     FOR SELECT USING (auth.role() = 'authenticated');
--
-- This allows all logged-in users to see full profiles (including
-- email) but blocks anonymous access. Less secure than the view
-- approach but requires zero frontend changes.
-- ================================================================
