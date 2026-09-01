-- ================================================================
-- place_order RPC function
-- Called by frontend: supabase.rpc('place_order', { p_address, p_payment_method })
--
-- Reads the buyer's cart, calculates all prices server-side (preventing
-- client-side price manipulation), creates order + order_items, clears
-- cart, decrements stock. Returns the new order row.
-- ================================================================

CREATE OR REPLACE FUNCTION public.place_order(
  p_address     jsonb,
  p_payment_method text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer     uuid := auth.uid();
  v_code      text;
  v_subtotal  numeric(12,2) := 0;
  v_shipping  numeric(10,2) := 0;
  v_commission numeric(12,2);
  v_total     numeric(12,2);
  v_order     public.orders;
  v_item      record;
  v_img       text;
BEGIN
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Generate unique order code ──────────────────────────────
  v_code := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

  -- ── Build order items from cart (server-side price lookup) ──
  -- We create a temporary table to hold the computed items
  CREATE TEMP TABLE _order_items ON COMMIT DROP AS
  SELECT
    ci.product_id,
    p.store_id,
    p.seller_id,
    p.name,
    (SELECT url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS image,
    ci.qty,
    p.price,
    p.shipping_fee,
    p.stock
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_buyer;

  -- Validate cart is not empty
  IF NOT EXISTS (SELECT 1 FROM _order_items) THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Validate all items have sufficient stock
  IF EXISTS (SELECT 1 FROM _order_items WHERE qty > stock) THEN
    RAISE EXCEPTION 'Insufficient stock for one or more items';
  END IF;

  -- ── Calculate totals (server-side — client cannot manipulate) ─
  SELECT
    COALESCE(SUM(price * qty), 0),
    COALESCE(SUM(shipping_fee), 0)
  INTO v_subtotal, v_shipping
  FROM _order_items;

  v_commission := round(v_subtotal * 0.08, 2);  -- 8% platform commission
  v_total      := v_subtotal + v_shipping;

  -- ── Create the order ───────────────────────────────────────
  INSERT INTO public.orders (
    code, buyer_id, buyer_name, status, payment, payment_method,
    subtotal, shipping, total, commission, address
  )
  SELECT
    v_code,
    v_buyer,
    COALESCE((SELECT full_name FROM public.profiles WHERE id = v_buyer), 'Buyer'),
    'pending',
    'pending',
    p_payment_method,
    v_subtotal,
    v_shipping,
    v_total,
    v_commission,
    p_address
  RETURNING * INTO v_order;

  -- ── Create order items ─────────────────────────────────────
  INSERT INTO public.order_items (order_id, product_id, store_id, name, image, qty, price, status)
  SELECT
    v_order.id,
    oi.product_id,
    oi.store_id,
    oi.name,
    oi.image,
    oi.qty,
    oi.price,
    'pending'
  FROM _order_items oi;

  -- ── Decrement stock ────────────────────────────────────────
  UPDATE public.products p
  SET stock = p.stock - oi.qty,
      sold  = p.sold + oi.qty
  FROM _order_items oi
  WHERE p.id = oi.product_id;

  -- ── Create payment record ──────────────────────────────────
  INSERT INTO public.payments (order_id, buyer_id, amount, commission, seller_earnings, method, status)
  VALUES (
    v_order.id,
    v_buyer,
    v_total,
    v_commission,
    v_total - v_commission,
    p_payment_method,
    'pending'
  );

  -- ── Notify sellers ─────────────────────────────────────────
  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT DISTINCT
    oi.seller_id,
    'order',
    'New order received 🛒',
    'Order ' || v_code || ' — ' || oi.qty || '× ' || oi.name
  FROM _order_items oi;

  -- ── Clear buyer's cart ─────────────────────────────────────
  DELETE FROM public.cart_items WHERE user_id = v_buyer;

  DROP TABLE IF EXISTS _order_items;

  RETURN v_order;
END;
$$;

-- ================================================================
-- set_order_item_status RPC function
-- Called by frontend: supabase.rpc('set_order_item_status', { p_order_item, p_status })
--
-- Allows sellers to update the status of their own order items.
-- Automatically updates the parent order status when all items
-- reach the same status.
-- ================================================================

CREATE OR REPLACE FUNCTION public.set_order_item_status(
  p_order_item uuid,
  p_status     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_item      record;
  v_is_admin  boolean;
  v_all_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the order item and verify ownership
  SELECT oi.*, o.buyer_id
  INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_order_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  -- Check if user is admin or the seller of this item
  v_is_admin := public.my_role() = 'admin';
  IF NOT v_is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.seller_stores
      WHERE id = v_item.store_id AND seller_id = v_user
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this order item';
    END IF;
  END IF;

  -- Validate the status
  IF p_status NOT IN ('pending','confirmed','processing','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update the item
  UPDATE public.order_items
  SET status = p_status
  WHERE id = p_order_item;

  -- Auto-update parent order status based on aggregate
  SELECT
    CASE
      WHEN bool_and(status = 'delivered') THEN 'delivered'
      WHEN bool_and(status = 'cancelled') THEN 'cancelled'
      WHEN bool_or(status = 'shipped')    THEN 'shipped'
      WHEN bool_or(status = 'processing') THEN 'processing'
      WHEN bool_or(status = 'confirmed')  THEN 'confirmed'
      ELSE 'pending'
    END
  INTO v_all_status
  FROM public.order_items
  WHERE order_id = v_item.order_id;

  UPDATE public.orders
  SET status = v_all_status,
      payment = CASE WHEN v_all_status = 'delivered' THEN 'paid'
                     WHEN v_all_status = 'cancelled' THEN 'refunded'
                     ELSE payment END
  WHERE id = v_item.order_id;

  -- Notify buyer of status change
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    v_item.buyer_id,
    'order',
    'Order ' || (SELECT code FROM public.orders WHERE id = v_item.order_id) || ' updated',
    'Your order item is now: ' || p_status
  );
END;
$$;
