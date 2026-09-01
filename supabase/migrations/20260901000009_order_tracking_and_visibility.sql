-- Canonical order statuses, secure order fetch, role-gated transitions,
-- status history roles, and RLS that does not recurse through order_items.

-- ── History role column ────────────────────────────────────────
ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS changed_by_role text;

-- ── Map legacy statuses ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_order_status(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p
    WHEN 'pending' THEN 'submitted'
    WHEN 'confirmed' THEN 'submitted'
    WHEN 'processing' THEN 'packaging'
    WHEN 'shipped' THEN 'sent_to_platform'
    WHEN 'out_for_delivery' THEN 'on_way'
    WHEN 'delivered' THEN 'reached_to_buyer'
    WHEN 'ready_to_packing' THEN 'packaging'
    ELSE p
  END;
$$;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_status_check;

UPDATE public.orders SET status = public.normalize_order_status(status);
UPDATE public.order_items SET status = public.normalize_order_status(status);
UPDATE public.order_status_history
  SET from_status = CASE WHEN from_status IS NULL THEN NULL ELSE public.normalize_order_status(from_status) END,
      to_status = public.normalize_order_status(to_status);

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'submitted';
ALTER TABLE public.order_items ALTER COLUMN status SET DEFAULT 'submitted';

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'submitted','packaging','packed','sent_to_platform','on_way','reached_to_buyer','cancelled'
  ]));

ALTER TABLE public.order_items ADD CONSTRAINT order_items_status_check
  CHECK (status = ANY (ARRAY[
    'submitted','packaging','packed','sent_to_platform','on_way','reached_to_buyer','cancelled'
  ]));

-- ── Status rank / transitions ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.order_status_rank(p text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE public.normalize_order_status(p)
    WHEN 'submitted' THEN 0
    WHEN 'packaging' THEN 1
    WHEN 'packed' THEN 2
    WHEN 'sent_to_platform' THEN 3
    WHEN 'on_way' THEN 4
    WHEN 'reached_to_buyer' THEN 5
    WHEN 'cancelled' THEN -1
    ELSE -2
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_advance_status(p_from text, p_to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.normalize_order_status(p_from) = public.normalize_order_status(p_to) THEN true
    WHEN public.normalize_order_status(p_to) = 'cancelled'
      AND public.normalize_order_status(p_from) = 'submitted' THEN true
    WHEN public.normalize_order_status(p_from) = 'submitted' AND public.normalize_order_status(p_to) = 'packaging' THEN true
    WHEN public.normalize_order_status(p_from) = 'packaging' AND public.normalize_order_status(p_to) = 'packed' THEN true
    WHEN public.normalize_order_status(p_from) = 'packed' AND public.normalize_order_status(p_to) = 'sent_to_platform' THEN true
    WHEN public.normalize_order_status(p_from) = 'sent_to_platform' AND public.normalize_order_status(p_to) = 'on_way' THEN true
    WHEN public.normalize_order_status(p_from) = 'on_way' AND public.normalize_order_status(p_to) = 'reached_to_buyer' THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.aggregate_order_status(p_order_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id) THEN 'submitted'
    WHEN (SELECT bool_and(status = 'cancelled') FROM public.order_items WHERE order_id = p_order_id) THEN 'cancelled'
    ELSE (
      SELECT x.status FROM public.order_items x
      WHERE x.order_id = p_order_id AND x.status <> 'cancelled'
      ORDER BY public.order_status_rank(x.status) ASC
      LIMIT 1
    )
  END;
$$;

-- ── RLS helpers (bypass nested policy recursion) ───────────────
CREATE OR REPLACE FUNCTION public.user_store_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.seller_stores WHERE seller_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_read_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = p_order_id AND o.buyer_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.seller_stores s ON s.id = oi.store_id
      WHERE oi.order_id = p_order_id AND s.seller_id = auth.uid()
    )
  );
$$;

REVOKE ALL ON FUNCTION public.user_store_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_store_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order(uuid) TO authenticated;

DROP POLICY IF EXISTS "buyer reads own orders" ON public.orders;
DROP POLICY IF EXISTS "seller reads related orders" ON public.orders;
DROP POLICY IF EXISTS "parties read orders" ON public.orders;
CREATE POLICY "parties read orders" ON public.orders
  FOR SELECT USING (public.can_read_order(id));

DROP POLICY IF EXISTS "buyer cancels own order" ON public.orders;
CREATE POLICY "buyer cancels own order" ON public.orders
  FOR UPDATE
  USING ((buyer_id = auth.uid() AND status = 'submitted') OR public.my_role() = 'admin')
  WITH CHECK (
    (buyer_id = auth.uid() AND status = 'cancelled')
    OR public.my_role() = 'admin'
  );

DROP POLICY IF EXISTS "order items readable by parties" ON public.order_items;
DROP POLICY IF EXISTS "parties read order items" ON public.order_items;
CREATE POLICY "parties read order items" ON public.order_items
  FOR SELECT USING (public.can_read_order(order_id));

DROP POLICY IF EXISTS "history readable by parties" ON public.order_status_history;
CREATE POLICY "history readable by parties" ON public.order_status_history
  FOR SELECT USING (public.can_read_order(order_id));

-- ── Fetch orders for the signed-in user (buyer, seller, or admin)
CREATE OR REPLACE FUNCTION public.fetch_my_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_admin := public.my_role() = 'admin';

  SELECT COALESCE(jsonb_agg(row_payload ORDER BY (row_payload->>'created_at') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', o.id,
      'code', o.code,
      'buyer_id', o.buyer_id,
      'buyer_name', o.buyer_name,
      'status', o.status,
      'payment', o.payment,
      'payment_method', o.payment_method,
      'subtotal', o.subtotal,
      'shipping', o.shipping,
      'total', o.total,
      'commission', o.commission,
      'address', o.address,
      'created_at', o.created_at,
      'items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'store_id', oi.store_id,
          'name', oi.name,
          'image', oi.image,
          'qty', oi.qty,
          'price', oi.price,
          'status', oi.status,
          'tracking_code', oi.tracking_code,
          'courier', oi.courier,
          'estimated_delivery', oi.estimated_delivery
        ) ORDER BY oi.id)
        FROM public.order_items oi
        WHERE oi.order_id = o.id
          AND (
            v_admin
            OR o.buyer_id = v_uid
            OR oi.store_id IN (SELECT public.user_store_ids())
          )
      ), '[]'::jsonb),
      'history', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', h.id,
          'order_id', h.order_id,
          'order_item_id', h.order_item_id,
          'from_status', h.from_status,
          'to_status', h.to_status,
          'changed_by', h.changed_by,
          'changed_by_role', h.changed_by_role,
          'note', h.note,
          'created_at', h.created_at
        ) ORDER BY h.created_at)
        FROM public.order_status_history h
        WHERE h.order_id = o.id
      ), '[]'::jsonb)
    ) AS row_payload
    FROM public.orders o
    WHERE v_admin
      OR o.buyer_id = v_uid
      OR EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.seller_stores s ON s.id = oi.store_id
        WHERE oi.order_id = o.id AND s.seller_id = v_uid
      )
  ) q;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_my_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_my_orders() TO authenticated;

-- ── place_order: submitted + buyer/seller notifications + email snapshot
CREATE OR REPLACE FUNCTION public.place_order(p_address jsonb, p_payment_method text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_code text;
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_commission numeric(12,2);
  v_total numeric(12,2);
  v_order public.orders;
  v_method text := lower(trim(p_payment_method));
  v_buyer_row public.profiles;
  v_tx_status text;
  v_address jsonb;
BEGIN
  IF v_buyer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF v_method IN ('card','cash on delivery') THEN
    v_method := CASE WHEN v_method = 'card' THEN 'bank_transfer' ELSE 'cod' END;
  END IF;
  IF v_method NOT IN ('easypaisa','jazzcash','sadapay','bank_transfer','cod') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;

  SELECT * INTO v_buyer_row FROM public.profiles WHERE id = v_buyer;
  v_code := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
  v_address := COALESCE(p_address, '{}'::jsonb) || jsonb_build_object(
    'email', COALESCE(NULLIF(p_address->>'email', ''), v_buyer_row.email),
    'full_name', COALESCE(NULLIF(p_address->>'full_name', ''), v_buyer_row.full_name),
    'phone', COALESCE(NULLIF(p_address->>'phone', ''), v_buyer_row.phone)
  );

  CREATE TEMP TABLE _order_items ON COMMIT DROP AS
  SELECT ci.product_id, p.store_id, p.seller_id, p.name,
    COALESCE(NULLIF(p.image, ''), (SELECT url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1)) AS image,
    ci.qty, p.price, p.shipping_fee, p.stock
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_buyer AND p.status = 'active';

  IF NOT EXISTS (SELECT 1 FROM _order_items) THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  IF EXISTS (SELECT 1 FROM _order_items WHERE qty > stock) THEN RAISE EXCEPTION 'Insufficient stock for one or more items'; END IF;

  SELECT COALESCE(SUM(price * qty), 0), COALESCE(SUM(shipping_fee), 0) INTO v_subtotal, v_shipping FROM _order_items;
  v_commission := round(v_subtotal * 0.08, 2);
  v_total := v_subtotal + v_shipping;

  INSERT INTO public.orders (code, buyer_id, buyer_name, status, payment, payment_method, subtotal, shipping, total, commission, address)
  VALUES (v_code, v_buyer, COALESCE(v_buyer_row.full_name, 'Buyer'), 'submitted', 'pending', v_method, v_subtotal, v_shipping, v_total, v_commission, v_address)
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (order_id, product_id, store_id, name, image, qty, price, status)
  SELECT v_order.id, product_id, store_id, name, image, qty, price, 'submitted' FROM _order_items;

  UPDATE public.products p SET stock = p.stock - oi.qty, sold = p.sold + oi.qty
  FROM _order_items oi WHERE p.id = oi.product_id;

  v_tx_status := CASE WHEN v_method = 'cod' THEN 'pending' WHEN v_method = 'bank_transfer' THEN 'awaiting_proof' ELSE 'awaiting_provider' END;

  INSERT INTO public.payments (order_id, buyer_id, amount, commission, seller_earnings, method, status)
  VALUES (v_order.id, v_buyer, v_total, v_commission, v_total - v_commission, v_method, 'pending');

  INSERT INTO public.payment_transactions (order_id, buyer_id, provider, status, amount, metadata)
  VALUES (v_order.id, v_buyer, v_method, v_tx_status, v_total, jsonb_build_object('note', 'Created at checkout. Live provider confirmation required except COD.'));

  INSERT INTO public.order_status_history (order_id, to_status, changed_by, changed_by_role, note)
  VALUES (v_order.id, 'submitted', v_buyer, 'buyer', 'Order placed');

  INSERT INTO public.notifications (user_id, type, title, body, href)
  VALUES (v_buyer, 'order', '✓ Order Submitted',
    'Your order #' || v_code || ' has been submitted successfully.',
    '/dashboard/orders');

  INSERT INTO public.notifications (user_id, type, title, body, href)
  SELECT DISTINCT oi.seller_id, 'order', '🔔 New Order',
    'New order #' || v_code || ' has been received.',
    '/seller/orders'
  FROM _order_items oi;

  INSERT INTO public.notification_outbox (kind, payload)
  SELECT 'order_seller_email', jsonb_build_object(
    'order_id', v_order.id, 'order_code', v_code, 'seller_id', s.seller_id, 'store_id', s.id,
    'store_name', s.name, 'seller_email', pr.email, 'seller_name', pr.full_name,
    'whatsapp', s.whatsapp_number, 'whatsapp_verified', s.whatsapp_verified,
    'buyer_name', COALESCE(v_buyer_row.full_name, 'Buyer'), 'buyer_email', v_buyer_row.email,
    'buyer_phone', COALESCE(v_buyer_row.phone, v_address->>'phone'), 'address', v_address,
    'payment_method', v_method, 'payment_status', 'pending', 'order_status', 'submitted',
    'subtotal', v_subtotal, 'shipping', v_shipping, 'total', v_total,
    'items', (SELECT jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'price', price, 'total', price * qty, 'image', image)) FROM _order_items x WHERE x.store_id = s.id)
  )
  FROM (SELECT DISTINCT store_id FROM _order_items) d
  JOIN public.seller_stores s ON s.id = d.store_id
  JOIN public.profiles pr ON pr.id = s.seller_id;

  INSERT INTO public.notification_outbox (kind, payload)
  SELECT 'order_seller_whatsapp', jsonb_build_object(
    'order_id', v_order.id, 'order_code', v_code, 'seller_id', s.seller_id, 'store_id', s.id,
    'store_name', s.name, 'whatsapp', s.whatsapp_number, 'whatsapp_verified', s.whatsapp_verified,
    'buyer_name', COALESCE(v_buyer_row.full_name, 'Buyer'), 'payment_method', v_method, 'total', v_total,
    'items', (SELECT jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'price', price, 'total', price * qty)) FROM _order_items x WHERE x.store_id = s.id)
  )
  FROM (SELECT DISTINCT store_id FROM _order_items) d
  JOIN public.seller_stores s ON s.id = d.store_id
  WHERE s.whatsapp_verified IS TRUE AND COALESCE(s.whatsapp_number, '') <> '';

  DELETE FROM public.cart_items WHERE user_id = v_buyer;
  DROP TABLE IF EXISTS _order_items;
  RETURN v_order;
END;
$$;

-- ── Role-gated item status (kept for compatibility)
CREATE OR REPLACE FUNCTION public.set_order_item_status(p_order_item uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_item record;
  v_is_admin boolean;
  v_role text;
  v_to text := public.normalize_order_status(p_status);
  v_all_status text;
  v_code text;
  v_title text;
  v_body text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT oi.*, o.buyer_id, o.code AS order_code, o.status AS order_status, o.payment_method
  INTO v_item FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = p_order_item;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item not found'; END IF;

  v_role := public.my_role();
  v_is_admin := v_role = 'admin';
  IF NOT v_is_admin THEN
    IF NOT EXISTS (SELECT 1 FROM public.seller_stores WHERE id = v_item.store_id AND seller_id = v_user AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'Not authorized to update this order item';
    END IF;
    IF v_to NOT IN ('packaging','packed','sent_to_platform') THEN
      RAISE EXCEPTION 'Sellers cannot set status %', v_to;
    END IF;
  END IF;

  IF v_to NOT IN ('submitted','packaging','packed','sent_to_platform','on_way','reached_to_buyer','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', v_to;
  END IF;
  IF NOT public.can_advance_status(v_item.status, v_to) THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', v_item.status, v_to;
  END IF;
  IF v_to IN ('on_way','reached_to_buyer') AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only the platform owner can update delivery status';
  END IF;

  UPDATE public.order_items SET status = v_to WHERE id = p_order_item;
  INSERT INTO public.order_status_history (order_id, order_item_id, from_status, to_status, changed_by, changed_by_role, note)
  VALUES (v_item.order_id, p_order_item, v_item.status, v_to, v_user, CASE WHEN v_is_admin THEN 'admin' ELSE 'seller' END, 'Status updated');

  v_all_status := public.aggregate_order_status(v_item.order_id);
  UPDATE public.orders SET status = v_all_status,
    payment = CASE
      WHEN v_all_status = 'cancelled' THEN 'refunded'
      WHEN v_all_status = 'reached_to_buyer' AND payment_method IN ('cod','Cash on delivery') THEN 'paid'
      ELSE payment END
  WHERE id = v_item.order_id;

  v_code := v_item.order_code;
  v_title := CASE v_to
    WHEN 'packaging' THEN '🔔 Order Update'
    WHEN 'packed' THEN '🔔 Order Update'
    WHEN 'sent_to_platform' THEN '🔔 Order Update'
    WHEN 'on_way' THEN '🚚 Your Order Is On The Way'
    WHEN 'reached_to_buyer' THEN '✓ Order Reached the Buyer'
    WHEN 'cancelled' THEN 'Order Cancelled'
    ELSE 'Order Update' END;
  v_body := CASE v_to
    WHEN 'packaging' THEN 'Your order #' || v_code || ' is ready for packing.'
    WHEN 'packed' THEN 'Your order #' || v_code || ' has been packed.'
    WHEN 'sent_to_platform' THEN 'Your order #' || v_code || ' has been sent to the platform owner.'
    WHEN 'on_way' THEN 'Your order #' || v_code || ' is on the way.'
    WHEN 'reached_to_buyer' THEN 'Your order #' || v_code || ' has reached the buyer.'
    ELSE 'Your order #' || v_code || ' is now: ' || v_to END;

  INSERT INTO public.notifications (user_id, type, title, body, href)
  VALUES (v_item.buyer_id, 'order', v_title, v_body, '/dashboard/orders');
END;
$$;

-- ── Advance every item the caller is allowed to change on an order
CREATE OR REPLACE FUNCTION public.advance_order(p_order_id uuid, p_to text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_admin boolean;
  v_role text;
  v_to text := public.normalize_order_status(p_to);
  v_from text;
  v_updated int := 0;
  v_code text;
  v_buyer uuid;
  v_method text;
  v_all_status text;
  v_title text;
  v_body text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT code, buyer_id, payment_method INTO v_code, v_buyer, v_method FROM public.orders WHERE id = p_order_id;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_role := public.my_role();
  v_is_admin := v_role = 'admin';

  IF NOT v_is_admin THEN
    IF v_to NOT IN ('packaging','packed','sent_to_platform') THEN
      RAISE EXCEPTION 'Sellers cannot set status %', v_to;
    END IF;
  ELSIF v_to NOT IN ('packaging','packed','sent_to_platform','on_way','reached_to_buyer') THEN
    RAISE EXCEPTION 'Invalid status: %', v_to;
  END IF;

  SELECT status INTO v_from
  FROM public.order_items
  WHERE order_id = p_order_id
    AND status <> 'cancelled'
    AND (
      v_is_admin
      OR store_id IN (SELECT id FROM public.seller_stores WHERE seller_id = v_user AND deleted_at IS NULL)
    )
  ORDER BY public.order_status_rank(status) ASC
  LIMIT 1;

  IF v_from IS NULL THEN RAISE EXCEPTION 'No matching items to update, or you are not authorized'; END IF;
  IF NOT public.can_advance_status(v_from, v_to) OR v_from = v_to THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', v_from, v_to;
  END IF;

  UPDATE public.order_items
  SET status = v_to
  WHERE order_id = p_order_id
    AND status = v_from
    AND (
      v_is_admin
      OR store_id IN (SELECT id FROM public.seller_stores WHERE seller_id = v_user AND deleted_at IS NULL)
    );
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'No matching items to update, or you are not authorized'; END IF;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_role, note)
  VALUES (p_order_id, v_from, v_to, v_user, CASE WHEN v_is_admin THEN 'admin' ELSE 'seller' END, 'Order status updated');

  v_all_status := public.aggregate_order_status(p_order_id);
  UPDATE public.orders SET status = v_all_status,
    payment = CASE
      WHEN v_all_status = 'cancelled' THEN 'refunded'
      WHEN v_all_status = 'reached_to_buyer' AND v_method IN ('cod','Cash on delivery') THEN 'paid'
      ELSE payment END
  WHERE id = p_order_id;

  v_title := CASE v_to
    WHEN 'packaging' THEN '🔔 Order Update'
    WHEN 'packed' THEN '🔔 Order Update'
    WHEN 'sent_to_platform' THEN '🔔 Order Update'
    WHEN 'on_way' THEN '🚚 Your Order Is On The Way'
    WHEN 'reached_to_buyer' THEN '✓ Order Reached the Buyer'
    ELSE 'Order Update' END;
  v_body := CASE v_to
    WHEN 'packaging' THEN 'Your order #' || v_code || ' is ready for packing.'
    WHEN 'packed' THEN 'Your order #' || v_code || ' has been packed.'
    WHEN 'sent_to_platform' THEN 'Your order #' || v_code || ' has been sent to the platform owner.'
    WHEN 'on_way' THEN 'Your order #' || v_code || ' is on the way.'
    WHEN 'reached_to_buyer' THEN 'Your order #' || v_code || ' has reached the buyer.'
    ELSE 'Your order #' || v_code || ' is now: ' || v_to END;

  INSERT INTO public.notifications (user_id, type, title, body, href)
  VALUES (v_buyer, 'order', v_title, v_body, '/dashboard/orders');
END;
$$;

REVOKE ALL ON FUNCTION public.advance_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders;
  v_role text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  v_role := public.my_role();
  IF v_order.buyer_id <> v_user AND v_role <> 'admin' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_order.status <> 'submitted' AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'This order can no longer be cancelled';
  END IF;
  UPDATE public.order_items SET status = 'cancelled' WHERE order_id = p_order_id;
  UPDATE public.orders SET status = 'cancelled', payment = 'refunded' WHERE id = p_order_id;
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_role, note)
  VALUES (p_order_id, v_order.status, 'cancelled', v_user, CASE WHEN v_role = 'admin' THEN 'admin' ELSE 'buyer' END, 'Order cancelled');
  INSERT INTO public.notifications (user_id, type, title, body, href)
  SELECT DISTINCT s.seller_id, 'order', 'Order cancelled',
    'Order #' || v_order.code || ' was cancelled.', '/seller/orders'
  FROM public.order_items oi JOIN public.seller_stores s ON s.id = oi.store_id WHERE oi.order_id = p_order_id;
  IF v_order.buyer_id <> v_user THEN
    INSERT INTO public.notifications (user_id, type, title, body, href)
    VALUES (v_order.buyer_id, 'order', 'Order Cancelled', 'Your order #' || v_order.code || ' was cancelled.', '/dashboard/orders');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_my_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_my_orders() TO authenticated;
REVOKE ALL ON FUNCTION public.advance_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_order(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.can_read_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_order(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.user_store_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_store_ids() TO authenticated;
