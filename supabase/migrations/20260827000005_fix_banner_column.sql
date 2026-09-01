-- ================================================================
-- FIX: banner_url → banner column rename in seller_stores
--
-- PROBLEM: The schema.sql defines `banner_url` but the frontend
-- TypeScript type uses `banner`, and db.ts writes `banner: data.banner`.
-- This mismatch causes Supabase insert/update errors when creating
-- or editing a store.
--
-- FIX: Rename the column to match the frontend. Safe — no data loss.
--
-- NOTE: If the live database already uses `banner` (not banner_url),
-- this migration will fail harmlessly (column doesn't exist to rename).
-- Run the IF EXISTS check first.
-- ================================================================

-- Only rename if banner_url exists and banner doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'seller_stores'
    AND column_name = 'banner_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'seller_stores'
    AND column_name = 'banner'
  ) THEN
    ALTER TABLE public.seller_stores RENAME COLUMN banner_url TO banner;
    RAISE NOTICE 'Renamed seller_stores.banner_url to seller_stores.banner';
  ELSE
    RAISE NOTICE 'Column rename not needed (banner_url does not exist or banner already exists)';
  END IF;
END $$;

-- Also update the schema.sql reference (for documentation)
-- The schema should use `banner` not `banner_url`
