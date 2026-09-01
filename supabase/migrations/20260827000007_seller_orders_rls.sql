-- ================================================================
-- SELLER ORDERS/PAYMENTS READ ACCESS
--
-- PROBLEM: The orders table only allows buyer + admin SELECT.
-- Sellers can UPDATE order_items via set_order_item_status RPC,
-- but CANNOT read the parent orders table to see order status,
-- shipping address, buyer info, or payment status.
--
-- This breaks the seller dashboard: sellers can't view their
-- orders, can't see order details, and can't verify status
-- changes after calling set_order_item_status.
--
-- FIX: Allow sellers to read orders that contain items from
-- their stores. Also allow sellers to read payments for orders
-- they're involved in.
-- ================================================================

-- Orders: allow sellers to read orders containing their items
DROP POLICY IF EXISTS "seller reads related orders" ON public.orders;
CREATE POLICY "seller reads related orders" ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = public.orders.id
        AND EXISTS (
          SELECT 1 FROM public.seller_stores s
          WHERE s.id = oi.store_id AND s.seller_id = auth.uid()
        )
    )
  );

-- Payments: allow sellers to read payments for orders containing their items
DROP POLICY IF EXISTS "seller reads related payments" ON public.payments;
CREATE POLICY "seller reads related payments" ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = public.payments.order_id
        AND EXISTS (
          SELECT 1 FROM public.seller_stores s
          WHERE s.id = oi.store_id AND s.seller_id = auth.uid()
        )
    )
  );
