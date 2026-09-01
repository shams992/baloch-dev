-- Commerce hardening: 2-store limit, soft-delete stores, order workflow,
-- status history, email subscribers, payment transactions, notification links,
-- RPC security, seller WhatsApp fields.

-- ── Store columns ──────────────────────────────────────────────
ALTER TABLE public.seller_stores
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_verified boolean NOT NULL DEFAULT false;

-- ── Conversations: optional store/order linkage ────────────────
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.seller_stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;

-- ── Notifications: deep link ───────────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS href text;

-- ── Order item extras ──────────────────────────────────────────
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS courier text,
  ADD COLUMN IF NOT EXISTS estimated_delivery text;

-- ── Expand order statuses ──────────────────────────────────────
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled'
  ]));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_status_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_status_check
  CHECK (status = ANY (ARRAY[
    'pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled'
  ]));

-- ── Order status history ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON public.order_status_history(order_id, created_at);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history readable by parties" ON public.order_status_history;
CREATE POLICY "history readable by parties" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.buyer_id = auth.uid() OR public.my_role() = 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.seller_stores s ON s.id = oi.store_id
      WHERE oi.order_id = order_status_history.order_id
        AND s.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "history insertable by definer" ON public.order_status_history;
CREATE POLICY "history insertable by definer" ON public.order_status_history
  FOR INSERT WITH CHECK (changed_by = auth.uid() OR public.my_role() = 'admin');

-- ── Email subscribers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  email text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_subscribed boolean NOT NULL DEFAULT true,
  unsubscribe_token uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_subscribers_email_key UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS email_subscribers_active_idx ON public.email_subscribers(is_subscribed) WHERE is_subscribed;

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own subscription readable" ON public.email_subscribers;
CREATE POLICY "own subscription readable" ON public.email_subscribers
  FOR SELECT USING (user_id = auth.uid() OR public.my_role() = 'admin');

DROP POLICY IF EXISTS "own subscription updatable" ON public.email_subscribers;
CREATE POLICY "own subscription updatable" ON public.email_subscribers
  FOR UPDATE USING (user_id = auth.uid() OR public.my_role() = 'admin');

-- inserts go through subscribe_email RPC (security definer)

-- ── Payment transactions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending','awaiting_provider','awaiting_proof','paid','failed','cancelled'])),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  proof_url text,
  provider_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON public.payment_transactions(order_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own payment tx" ON public.payment_transactions;
CREATE POLICY "buyer reads own payment tx" ON public.payment_transactions
  FOR SELECT USING (buyer_id = auth.uid() OR public.my_role() = 'admin');

DROP POLICY IF EXISTS "seller reads related payment tx" ON public.payment_transactions;
CREATE POLICY "seller reads related payment tx" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.seller_stores s ON s.id = oi.store_id
      WHERE oi.order_id = payment_transactions.order_id AND s.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "buyer updates own proof" ON public.payment_transactions;
CREATE POLICY "buyer updates own proof" ON public.payment_transactions
  FOR UPDATE USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "admin manages payment tx" ON public.payment_transactions;
CREATE POLICY "admin manages payment tx" ON public.payment_transactions
  FOR ALL USING (public.my_role() = 'admin');

-- ── Notification outbox (email / WhatsApp) ─────────────────────
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  kind text NOT NULL CHECK (kind = ANY (ARRAY['order_seller_email','order_seller_whatsapp','product_marketing','order_status_email'])),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status = ANY (ARRAY['queued','sent','skipped_no_provider','failed'])),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS notification_outbox_queued_idx ON public.notification_outbox(status, created_at);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outbox admin read" ON public.notification_outbox;
CREATE POLICY "outbox admin read" ON public.notification_outbox
  FOR SELECT USING (public.my_role() = 'admin');

-- ── Approved-store visibility excludes archived ────────────────
DROP POLICY IF EXISTS "approved stores readable" ON public.seller_stores;
CREATE POLICY "approved stores readable" ON public.seller_stores
  FOR SELECT USING (
    ((is_approved AND deleted_at IS NULL AND COALESCE(blocked, false) = false)
      OR seller_id = auth.uid()
      OR public.my_role() = 'admin')
  );

-- Split seller manage policy: no hard-delete for sellers
DROP POLICY IF EXISTS "seller manages own store" ON public.seller_stores;
CREATE POLICY "seller inserts own store" ON public.seller_stores
  FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "seller updates own store" ON public.seller_stores
  FOR UPDATE USING (seller_id = auth.uid() OR public.my_role() = 'admin');
CREATE POLICY "admin deletes stores" ON public.seller_stores
  FOR DELETE USING (public.my_role() = 'admin');

-- Buyers may only cancel (not rewrite status to delivered etc.)
DROP POLICY IF EXISTS "buyer cancels own order" ON public.orders;
CREATE POLICY "buyer cancels own order" ON public.orders
  FOR UPDATE
  USING ((buyer_id = auth.uid() AND status IN ('pending','confirmed')) OR public.my_role() = 'admin')
  WITH CHECK (
    (buyer_id = auth.uid() AND status = 'cancelled')
    OR public.my_role() = 'admin'
  );

-- Sellers must use set_order_item_status RPC (enforces forward-only flow)
DROP POLICY IF EXISTS "seller updates own order items" ON public.order_items;
CREATE POLICY "admin updates order items" ON public.order_items
  FOR UPDATE USING (public.my_role() = 'admin');

-- ── 2-store limit (database enforced) ──────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_store_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.seller_stores
  WHERE seller_id = NEW.seller_id AND deleted_at IS NULL;
  IF v_count >= 2 THEN
    RAISE EXCEPTION 'You can create a maximum of 2 stores per account.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_limit ON public.seller_stores;
CREATE TRIGGER trg_store_limit
  BEFORE INSERT ON public.seller_stores
  FOR EACH ROW EXECUTE FUNCTION public.enforce_store_limit();

-- ── Subscribe / unsubscribe RPCs ───────────────────────────────
CREATE OR REPLACE FUNCTION public.subscribe_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_row public.email_subscribers;
BEGIN
  IF v_email IS NULL OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;
  INSERT INTO public.email_subscribers (email, user_id, is_subscribed, updated_at)
  VALUES (v_email, auth.uid(), true, now())
  ON CONFLICT (email) DO UPDATE
    SET is_subscribed = true,
        user_id = COALESCE(EXCLUDED.user_id, public.email_subscribers.user_id),
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('ok', true, 'email', v_row.email, 'is_subscribed', v_row.is_subscribed);
END;
$$;

CREATE OR REPLACE FUNCTION public.unsubscribe_email(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_subscribers
  SET is_subscribed = false, updated_at = now()
  WHERE unsubscribe_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found.';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Admin archive store (soft delete) ──────────────────────────
CREATE OR REPLACE FUNCTION public.archive_store(p_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store public.seller_stores;
BEGIN
  IF public.my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_store FROM public.seller_stores WHERE id = p_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found';
  END IF;
  UPDATE public.seller_stores
  SET deleted_at = now(), is_approved = false, blocked = true
  WHERE id = p_store_id;
  UPDATE public.products
  SET status = 'hidden'
  WHERE store_id = p_store_id AND status IN ('active','pending');
  RETURN jsonb_build_object('ok', true, 'store_id', p_store_id);
END;
$$;

-- ── Valid status transitions ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_advance_status(p_from text, p_to text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_from = p_to THEN true
    WHEN p_to = 'cancelled' AND p_from IN ('pending','confirmed') THEN true
    WHEN p_from = 'pending' AND p_to = 'confirmed' THEN true
    WHEN p_from = 'confirmed' AND p_to = 'processing' THEN true
    WHEN p_from = 'processing' AND p_to = 'packed' THEN true
    WHEN p_from = 'packed' AND p_to = 'shipped' THEN true
    WHEN p_from = 'shipped' AND p_to = 'out_for_delivery' THEN true
    WHEN p_from = 'out_for_delivery' AND p_to = 'delivered' THEN true
    -- allow skipping packed/out_for_delivery for older 5-step clients
    WHEN p_from = 'processing' AND p_to = 'shipped' THEN true
    WHEN p_from = 'shipped' AND p_to = 'delivered' THEN true
    ELSE false
  END;
$$;

-- ── place_order ────────────────────────────────────────────────
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
  v_method    text := lower(trim(p_payment_method));
  v_buyer_row public.profiles;
  v_tx_status text;
BEGIN
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_method IN ('card','cash on delivery') THEN
    v_method := CASE WHEN v_method = 'card' THEN 'bank_transfer' ELSE 'cod' END;
  END IF;
  IF v_method NOT IN ('easypaisa','jazzcash','sadapay','bank_transfer','cod') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;

  SELECT * INTO v_buyer_row FROM public.profiles WHERE id = v_buyer;

  v_code := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

  CREATE TEMP TABLE _order_items ON COMMIT DROP AS
  SELECT
    ci.product_id,
    p.store_id,
    p.seller_id,
    p.name,
    COALESCE(
      NULLIF(p.image, ''),
      (SELECT url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1)
    ) AS image,
    ci.qty,
    p.price,
    p.shipping_fee,
    p.stock
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_buyer AND p.status = 'active';

  IF NOT EXISTS (SELECT 1 FROM _order_items) THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  IF EXISTS (SELECT 1 FROM _order_items WHERE qty > stock) THEN
    RAISE EXCEPTION 'Insufficient stock for one or more items';
  END IF;

  SELECT COALESCE(SUM(price * qty), 0), COALESCE(SUM(shipping_fee), 0)
  INTO v_subtotal, v_shipping
  FROM _order_items;

  v_commission := round(v_subtotal * 0.08, 2);
  v_total      := v_subtotal + v_shipping;

  INSERT INTO public.orders (
    code, buyer_id, buyer_name, status, payment, payment_method,
    subtotal, shipping, total, commission, address
  )
  VALUES (
    v_code, v_buyer, COALESCE(v_buyer_row.full_name, 'Buyer'),
    'pending', 'pending', v_method,
    v_subtotal, v_shipping, v_total, v_commission, p_address
  )
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (order_id, product_id, store_id, name, image, qty, price, status)
  SELECT v_order.id, product_id, store_id, name, image, qty, price, 'pending'
  FROM _order_items;

  UPDATE public.products p
  SET stock = p.stock - oi.qty, sold = p.sold + oi.qty
  FROM _order_items oi
  WHERE p.id = oi.product_id;

  v_tx_status := CASE
    WHEN v_method = 'cod' THEN 'pending'
    WHEN v_method = 'bank_transfer' THEN 'awaiting_proof'
    ELSE 'awaiting_provider'
  END;

  INSERT INTO public.payments (order_id, buyer_id, amount, commission, seller_earnings, method, status)
  VALUES (v_order.id, v_buyer, v_total, v_commission, v_total - v_commission, v_method, 'pending');

  INSERT INTO public.payment_transactions (order_id, buyer_id, provider, status, amount, metadata)
  VALUES (v_order.id, v_buyer, v_method, v_tx_status, v_total, jsonb_build_object('note', 'Created at checkout. Live provider confirmation required except COD.'));

  INSERT INTO public.order_status_history (order_id, to_status, changed_by, note)
  VALUES (v_order.id, 'pending', v_buyer, 'Order placed');

  INSERT INTO public.notifications (user_id, type, title, body, href)
  SELECT DISTINCT
    oi.seller_id,
    'order',
    'New Order',
    'You received a new order from ' || COALESCE(v_buyer_row.full_name, 'a buyer') || '. Order ' || v_code || '.',
    '/seller/orders'
  FROM _order_items oi;

  INSERT INTO public.notification_outbox (kind, payload)
  SELECT 'order_seller_email', jsonb_build_object(
    'order_id', v_order.id,
    'order_code', v_code,
    'seller_id', s.seller_id,
    'store_id', s.id,
    'store_name', s.name,
    'seller_email', pr.email,
    'seller_name', pr.full_name,
    'whatsapp', s.whatsapp_number,
    'whatsapp_verified', s.whatsapp_verified,
    'buyer_name', COALESCE(v_buyer_row.full_name, 'Buyer'),
    'buyer_email', v_buyer_row.email,
    'buyer_phone', COALESCE(v_buyer_row.phone, p_address->>'phone'),
    'address', p_address,
    'payment_method', v_method,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'total', v_total,
    'items', (SELECT jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'price', price, 'total', price * qty)) FROM _order_items x WHERE x.store_id = s.id)
  )
  FROM (SELECT DISTINCT store_id FROM _order_items) d
  JOIN public.seller_stores s ON s.id = d.store_id
  JOIN public.profiles pr ON pr.id = s.seller_id;

  INSERT INTO public.notification_outbox (kind, payload)
  SELECT 'order_seller_whatsapp', jsonb_build_object(
    'order_id', v_order.id,
    'order_code', v_code,
    'seller_id', s.seller_id,
    'store_id', s.id,
    'store_name', s.name,
    'whatsapp', s.whatsapp_number,
    'whatsapp_verified', s.whatsapp_verified,
    'buyer_name', COALESCE(v_buyer_row.full_name, 'Buyer'),
    'payment_method', v_method,
    'total', v_total,
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

-- ── set_order_item_status with history + notifications ─────────
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
  v_code text;
  v_title text;
  v_body text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT oi.*, o.buyer_id, o.code AS order_code, o.status AS order_status
  INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_order_item;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  v_is_admin := public.my_role() = 'admin';
  IF NOT v_is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.seller_stores
      WHERE id = v_item.store_id AND seller_id = v_user AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this order item';
    END IF;
    IF NOT public.can_advance_status(v_item.status, p_status) THEN
      RAISE EXCEPTION 'Invalid status transition: % → %', v_item.status, p_status;
    END IF;
  ELSE
    IF p_status NOT IN ('pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled') THEN
      RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
  END IF;

  UPDATE public.order_items SET status = p_status WHERE id = p_order_item;

  INSERT INTO public.order_status_history (order_id, order_item_id, from_status, to_status, changed_by, note)
  VALUES (v_item.order_id, p_order_item, v_item.status, p_status, v_user, 'Seller updated item status');

  SELECT
    CASE
      WHEN bool_and(status = 'delivered') THEN 'delivered'
      WHEN bool_and(status = 'cancelled') THEN 'cancelled'
      WHEN bool_or(status = 'out_for_delivery') THEN 'out_for_delivery'
      WHEN bool_or(status = 'shipped') THEN 'shipped'
      WHEN bool_or(status = 'packed') THEN 'packed'
      WHEN bool_or(status = 'processing') THEN 'processing'
      WHEN bool_or(status = 'confirmed') THEN 'confirmed'
      ELSE 'pending'
    END
  INTO v_all_status
  FROM public.order_items
  WHERE order_id = v_item.order_id;

  UPDATE public.orders
  SET status = v_all_status,
      payment = CASE
        WHEN v_all_status = 'cancelled' THEN 'refunded'
        WHEN v_all_status = 'delivered' AND payment_method IN ('cod','Cash on delivery') THEN 'paid'
        ELSE payment
      END
  WHERE id = v_item.order_id;

  v_code := v_item.order_code;
  v_title := CASE p_status
    WHEN 'confirmed' THEN 'Order Confirmed'
    WHEN 'processing' THEN 'Order Processing'
    WHEN 'packed' THEN 'Order Packed'
    WHEN 'shipped' THEN 'Order Shipped'
    WHEN 'out_for_delivery' THEN 'Out for Delivery'
    WHEN 'delivered' THEN 'Order Delivered'
    WHEN 'cancelled' THEN 'Order Cancelled'
    ELSE 'Order updated'
  END;
  v_body := CASE p_status
    WHEN 'confirmed' THEN 'Your order #' || v_code || ' has been confirmed by the seller.'
    WHEN 'processing' THEN 'Your order #' || v_code || ' is now being processed.'
    WHEN 'packed' THEN 'Your order #' || v_code || ' has been packed.'
    WHEN 'shipped' THEN 'Your order #' || v_code || ' has been shipped.'
    WHEN 'out_for_delivery' THEN 'Your order #' || v_code || ' is out for delivery.'
    WHEN 'delivered' THEN 'Your order #' || v_code || ' has been delivered.'
    ELSE 'Your order #' || v_code || ' is now: ' || p_status
  END;

  INSERT INTO public.notifications (user_id, type, title, body, href)
  VALUES (v_item.buyer_id, 'order', v_title, v_body, '/dashboard/orders');
END;
$$;

-- ── Product goes live → marketing outbox ───────────────────────
CREATE OR REPLACE FUNCTION public.on_product_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store public.seller_stores;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT * INTO v_store FROM public.seller_stores WHERE id = NEW.store_id;
    IF v_store.deleted_at IS NOT NULL OR v_store.is_approved IS NOT TRUE THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.notification_outbox (kind, payload)
    VALUES (
      'product_marketing',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'description', left(COALESCE(NEW.description,''), 180),
        'image', NEW.image,
        'store_name', v_store.name,
        'href', '/product/' || NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_live ON public.products;
CREATE TRIGGER trg_product_live
  AFTER INSERT OR UPDATE OF status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.on_product_live();

-- ── Buyer cancel via RPC (order_items UPDATE is admin/RPC only) ─
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order public.orders;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.buyer_id <> v_user AND public.my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_order.status NOT IN ('pending','confirmed') AND public.my_role() <> 'admin' THEN
    RAISE EXCEPTION 'This order can no longer be cancelled';
  END IF;

  UPDATE public.order_items SET status = 'cancelled' WHERE order_id = p_order_id;
  UPDATE public.orders SET status = 'cancelled', payment = 'refunded' WHERE id = p_order_id;
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
  VALUES (p_order_id, v_order.status, 'cancelled', v_user, 'Order cancelled');
  INSERT INTO public.notifications (user_id, type, title, body, href)
  SELECT DISTINCT s.seller_id, 'order', 'Order cancelled',
    'Order ' || v_order.code || ' was cancelled by the buyer.',
    '/seller/orders'
  FROM public.order_items oi
  JOIN public.seller_stores s ON s.id = oi.store_id
  WHERE oi.order_id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_message_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv public.conversations;
  v_recipient uuid;
  v_sender public.profiles;
  v_href text;
BEGIN
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  SELECT * INTO v_sender FROM public.profiles WHERE id = NEW.sender_id;
  v_recipient := CASE WHEN NEW.sender_id = v_conv.buyer_id THEN v_conv.seller_id ELSE v_conv.buyer_id END;
  v_href := CASE WHEN v_recipient = v_conv.seller_id THEN '/seller/messages' ELSE '/dashboard/messages' END;

  NEW.receiver_id := COALESCE(NEW.receiver_id, v_recipient);

  UPDATE public.conversations SET last_at = now(),
    buyer_unread  = CASE WHEN NEW.sender_id = seller_id THEN buyer_unread + 1  ELSE 0 END,
    seller_unread = CASE WHEN NEW.sender_id = buyer_id  THEN seller_unread + 1 ELSE 0 END
  WHERE id = NEW.conversation_id;

  INSERT INTO public.notifications (user_id, type, title, body, href)
  VALUES (
    v_recipient,
    'message',
    'New Message',
    COALESCE(v_sender.full_name, 'Someone') || ' sent you a message.',
    v_href
  );
  RETURN NEW;
END;
$$;

-- BEFORE INSERT so receiver_id is persisted
DROP TRIGGER IF EXISTS trg_message_sent ON public.messages;
DROP TRIGGER IF EXISTS trg_on_message_sent ON public.messages;
CREATE TRIGGER trg_on_message_sent
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_message_sent();

-- Tighten RPC grants (keep trigger functions executable by table owner)
REVOKE ALL ON FUNCTION public.place_order(jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_order_item_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_item_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_order_item_status(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_order(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.archive_store(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_store(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_store(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.subscribe_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_email(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.unsubscribe_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unsubscribe_email(uuid) TO anon, authenticated;

-- Payment proof bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "buyers upload payment proofs" ON storage.objects;
CREATE POLICY "buyers upload payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "parties read payment proofs" ON storage.objects;
CREATE POLICY "parties read payment proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.my_role() = 'admin'
    )
  );
