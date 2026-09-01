-- ================================================================
-- STORAGE POLICIES — Audit and fix bucket access policies
--
-- PROBLEMS FOUND:
-- 1. product-images: ANY authenticated user can upload (should be sellers)
-- 2. store-branding: ANY authenticated user can upload (should be sellers)
-- 3. profile-images: ANY authenticated user can upload (anyone can overwrite)
-- 4. No size/extension validation at DB level
--
-- FIXES:
-- - product-images: only sellers (via their store) and admins
-- - store-branding: only sellers (via their store) and admins
-- - profile-images: any authenticated user (for their own avatar)
-- - category-images: admin only
-- - All buckets: public read maintained
-- ================================================================

-- ── Drop existing storage policies ────────────────────────────
-- We drop and recreate to ensure clean state

-- Public read policies
DROP POLICY IF EXISTS "public read product images" ON storage.objects;

-- Upload policies
DROP POLICY IF EXISTS "auth users upload product images" ON storage.objects;
DROP POLICY IF EXISTS "sellers upload branding" ON storage.objects;
DROP POLICY IF EXISTS "users upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "admins upload category images" ON storage.objects;

-- Update/delete policies
DROP POLICY IF EXISTS "owners update objects" ON storage.objects;
DROP POLICY IF EXISTS "owners delete objects" ON storage.objects;

-- ── Public read for all platform imagery ──────────────────────
CREATE POLICY "public read product images" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('product-images', 'store-branding', 'profile-images', 'category-images'));

-- ── Upload policies ───────────────────────────────────────────

-- product-images: sellers and admins only
-- A seller can upload if they have a store (verified via seller_stores)
CREATE POLICY "sellers upload product images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.my_role() = 'admin'
      OR EXISTS (SELECT 1 FROM public.seller_stores WHERE seller_id = auth.uid())
    )
  );

-- store-branding: sellers and admins only
CREATE POLICY "sellers upload store branding" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'store-branding'
    AND (
      public.my_role() = 'admin'
      OR EXISTS (SELECT 1 FROM public.seller_stores WHERE seller_id = auth.uid())
    )
  );

-- profile-images: any authenticated user (for their own avatar)
CREATE POLICY "users upload avatars" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.role() = 'authenticated'
  );

-- category-images: admin only
CREATE POLICY "admins upload category images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'category-images'
    AND public.my_role() = 'admin'
  );

-- ── Update/delete policies ────────────────────────────────────

-- Owners can update their own objects
CREATE POLICY "owners update objects" ON storage.objects
  FOR UPDATE
  USING (owner = auth.uid());

-- Owners can delete their own objects; admins can delete any
CREATE POLICY "owners delete objects" ON storage.objects
  FOR DELETE
  USING (owner = auth.uid() OR public.my_role() = 'admin');
