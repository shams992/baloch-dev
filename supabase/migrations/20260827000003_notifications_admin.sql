-- ================================================================
-- NOTIFICATIONS — Fix admin INSERT policy
--
-- PROBLEM: The current policy:
--   with check (user_id = auth.uid())
--
-- This means only the notification OWNER can INSERT. Admins who need
-- to create notifications for other users (e.g. order updates,
-- moderation notices) are BLOCKED by this policy.
--
-- The place_order RPC (SECURITY DEFINER) can bypass RLS, so order
-- notifications work. But admin dashboard notifications would fail.
--
-- FIX: Allow admins to insert notifications for any user.
-- ================================================================

-- 1. Drop the existing overly-restrictive insert check
DROP POLICY IF EXISTS "own notifications" ON public.notifications;

-- 2. Recreate with admin-aware insert policy
-- SELECT: owner or admin can read
CREATE POLICY "own notifications readable" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid() OR public.my_role() = 'admin');

-- INSERT: owner can insert for self, admin can insert for anyone
CREATE POLICY "notifications insertable" ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.my_role() = 'admin');

-- UPDATE: owner can mark own as read, admin can update any
CREATE POLICY "notifications updatable" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid() OR public.my_role() = 'admin');

-- DELETE: admin only (owners shouldn't need to delete notifications)
CREATE POLICY "notifications deletable" ON public.notifications
  FOR DELETE
  USING (public.my_role() = 'admin');
