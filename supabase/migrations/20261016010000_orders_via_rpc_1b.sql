-- Security lockdown, part 1b: orders are created and advanced only through
-- server-side RPCs. Clients can no longer insert/update transactions directly,
-- so price, seller, fee and status can't be forged.
-- Also: follow-ups from review of 1a, and schema reconciliation with the code.

-- ---------------------------------------------------------------------------
-- 0. Review follow-ups for 1a
-- ---------------------------------------------------------------------------
-- (a) Sellers can't use withdraw to route around moderation: only active listings
--     can be withdrawn, and only previously-active listings can come back.
CREATE OR REPLACE FUNCTION public.guard_listing_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN RETURN NEW; END IF;
  IF (OLD.status = 'draft' AND NEW.status = 'pending_review')
     OR (OLD.status = 'pending_review' AND NEW.status = 'draft')
     OR (OLD.status = 'rejected' AND NEW.status = 'pending_review')
     OR (OLD.status = 'active' AND NEW.status IN ('sold', 'withdrawn'))
     OR (OLD.status = 'withdrawn' AND NEW.status = 'active')
     OR (OLD.status = 'sold' AND NEW.status = 'active')
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Invalid listing status transition: % -> %', OLD.status, NEW.status;
END;
$$;

-- (b) plant_id / provenance flag can't be injected: create_plant_for_listing would
--     otherwise take over an arbitrary plant. plant_id is only set by that trigger.
CREATE OR REPLACE FUNCTION public.guard_listing_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_review' END;
    NEW.plant_id := NULL;
    NEW.review_status := NULL;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.review_reason := NULL;
    NEW.review_notes := NULL;
    NEW.qr_verified_at := NULL;
    NEW.qr_verified_by := NULL;
    NEW.qr_verification_photo_url := NULL;
    NEW.boosted_until := NULL;
    NEW.view_count := 0;
    NEW.watch_count := 0;
    RETURN NEW;
  END IF;

  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.plant_id IS DISTINCT FROM OLD.plant_id
     OR NEW.review_status IS DISTINCT FROM OLD.review_status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.review_reason IS DISTINCT FROM OLD.review_reason
     OR NEW.review_notes IS DISTINCT FROM OLD.review_notes
     OR NEW.qr_verified_at IS DISTINCT FROM OLD.qr_verified_at
     OR NEW.qr_verified_by IS DISTINCT FROM OLD.qr_verified_by
     OR NEW.qr_verification_photo_url IS DISTINCT FROM OLD.qr_verification_photo_url
     OR NEW.view_count IS DISTINCT FROM OLD.view_count
     OR NEW.watch_count IS DISTINCT FROM OLD.watch_count
     OR NEW.has_qr_provenance IS DISTINCT FROM OLD.has_qr_provenance
  THEN
    RAISE EXCEPTION 'Protected listing columns can only be changed by admins';
  END IF;
  RETURN NEW;
END;
$$;

-- QR self-verification additionally requires that the seller currently owns the plant.
CREATE OR REPLACE FUNCTION public.submit_listing_qr_verification(
  p_listing_id uuid,
  p_photo_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  UPDATE public.listings l
  SET qr_verification_photo_url = p_photo_url,
      qr_verified_at = now(),
      qr_verified_by = auth.uid()
  WHERE l.id = p_listing_id
    AND l.seller_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.plants p
      WHERE p.id = l.plant_id AND p.current_owner_id = auth.uid()
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found, or you do not own its QR-tagged plant';
  END IF;
END;
$$;

-- (c) Dispute evidence: readable by the uploader, admins, or a party to a dispute
--     that actually references this file.
DROP POLICY IF EXISTS "Parties read dispute evidence" ON storage.objects;
CREATE POLICY "Parties read dispute evidence" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1
        FROM public.disputes d
        JOIN public.transactions t ON t.id = d.transaction_id
        WHERE (t.buyer_id = (SELECT auth.uid()) OR t.seller_id = (SELECT auth.uid()))
          AND array_to_string(d.evidence_urls, ' ') LIKE '%/' || objects.name || '%'
      )
      OR public.is_app_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- 1. Reconcile live schema with what the code and edge functions already use.
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS shipping_cost_thb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS escrow_release_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('stripe', 'direct'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_pi_uniq
  ON public.transactions (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;

-- One live order per listing, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_one_active_order_per_listing
  ON public.transactions (listing_id)
  WHERE status IN ('pending_payment', 'paid_in_escrow', 'shipped', 'delivered');

CREATE INDEX IF NOT EXISTS transactions_buyer_created_idx ON public.transactions (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_seller_created_idx ON public.transactions (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_pending_created_idx
  ON public.transactions (created_at) WHERE status = 'pending_payment';

-- ---------------------------------------------------------------------------
-- 2. create_order: price, fee, seller and status all come from the database.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(
  p_listing_id uuid,
  p_delivery_method text,
  p_shipping_address jsonb DEFAULT NULL,
  p_payment_method text DEFAULT 'direct'
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_shipping integer := 0;
  v_total integer;
  v_fee integer := 0;  -- Root charges no marketplace fee (see src/lib/platform-config.ts)
  v_tx public.transactions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF COALESCE((SELECT is_banned FROM public.profiles WHERE id = v_uid), false) THEN
    RAISE EXCEPTION 'Account suspended' USING ERRCODE = '42501';
  END IF;
  IF p_payment_method NOT IN ('stripe', 'direct') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF v_listing.seller_id = v_uid THEN
    RAISE EXCEPTION 'You cannot buy your own listing';
  END IF;
  IF NOT (p_delivery_method = ANY (v_listing.delivery_options)) THEN
    RAISE EXCEPTION 'Delivery method not offered for this listing';
  END IF;
  IF p_delivery_method = 'ship' THEN
    IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) <> 'object' THEN
      RAISE EXCEPTION 'Shipping address required';
    END IF;
    v_shipping := COALESCE(v_listing.shipping_cost_thb, 0)::integer;
  END IF;

  v_total := round(v_listing.price_thb)::integer + v_shipping;

  INSERT INTO public.transactions (
    listing_id, buyer_id, seller_id, species_label, image_url,
    sale_price_thb, platform_fee_thb, seller_payout_thb, shipping_cost_thb,
    status, payment_method, delivery_method, shipping_address, payment_confirmed
  ) VALUES (
    v_listing.id, v_uid, v_listing.seller_id,
    COALESCE(v_listing.species_common_en, 'Plant'), v_listing.image_url,
    v_total, v_fee, GREATEST(0, v_total - v_fee), v_shipping,
    'pending_payment', p_payment_method, p_delivery_method,
    CASE WHEN p_delivery_method = 'ship' THEN p_shipping_address ELSE NULL END,
    false
  ) RETURNING * INTO v_tx;

  UPDATE public.listings SET status = 'sold', updated_at = now() WHERE id = v_listing.id;
  RETURN v_tx;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order(uuid, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, jsonb, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Order actions. One entry point so role/state rules live in one place.
--    Actions: ship | deliver | complete | cancel | admin_resolve
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_action(
  p_order_id uuid,
  p_action text,
  p_courier text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL,
  p_shipment_photo_url text DEFAULT NULL,
  p_receipt_photo_path text DEFAULT NULL,
  p_resolution text DEFAULT NULL
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tx public.transactions;
  v_admin boolean;
  v_buyer boolean;
  v_seller boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  v_admin  := public.is_app_admin(v_uid);
  v_buyer  := v_tx.buyer_id = v_uid;
  v_seller := v_tx.seller_id = v_uid;
  IF NOT (v_admin OR v_buyer OR v_seller) THEN
    RAISE EXCEPTION 'Not your order' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'ship' THEN
    IF NOT (v_seller OR v_admin) THEN RAISE EXCEPTION 'Only the seller can ship'; END IF;
    IF v_tx.status <> 'paid_in_escrow' THEN RAISE EXCEPTION 'Order is not ready to ship'; END IF;
    IF COALESCE(btrim(p_courier), '') = '' THEN RAISE EXCEPTION 'Courier required'; END IF;
    UPDATE public.transactions SET
      status = 'shipped', shipped_at = now(),
      courier = left(btrim(p_courier), 80),
      tracking_number = left(NULLIF(btrim(COALESCE(p_tracking_number, '')), ''), 80),
      shipment_photo_url = p_shipment_photo_url
    WHERE id = p_order_id RETURNING * INTO v_tx;

  ELSIF p_action = 'deliver' THEN
    IF NOT (v_seller OR v_buyer OR v_admin) THEN RAISE EXCEPTION 'Not allowed'; END IF;
    IF v_tx.status <> 'shipped' THEN RAISE EXCEPTION 'Only shipped orders can be marked delivered'; END IF;
    UPDATE public.transactions SET status = 'delivered', delivered_at = now()
    WHERE id = p_order_id RETURNING * INTO v_tx;

  ELSIF p_action = 'complete' THEN
    IF NOT (v_buyer OR v_admin) THEN RAISE EXCEPTION 'Only the buyer can confirm receipt'; END IF;
    IF v_tx.status NOT IN ('shipped', 'delivered') THEN RAISE EXCEPTION 'Order has not shipped yet'; END IF;
    IF v_tx.status = 'shipped' THEN
      UPDATE public.transactions SET status = 'delivered', delivered_at = now() WHERE id = p_order_id;
    END IF;
    UPDATE public.transactions SET
      status = 'completed', completed_at = now(),
      receipt_photo_path = COALESCE(p_receipt_photo_path, receipt_photo_path)
    WHERE id = p_order_id RETURNING * INTO v_tx;

  ELSIF p_action = 'cancel' THEN
    IF NOT (
      v_admin
      OR (v_buyer  AND v_tx.status = 'pending_payment')
      OR (v_seller AND v_tx.status IN ('pending_payment', 'paid_in_escrow'))
    ) THEN
      RAISE EXCEPTION 'This order can no longer be cancelled; open a dispute instead';
    END IF;
    IF v_tx.status NOT IN ('pending_payment', 'paid_in_escrow', 'shipped') THEN
      RAISE EXCEPTION 'Order is already % ', v_tx.status;
    END IF;
    UPDATE public.transactions SET status = 'cancelled' WHERE id = p_order_id RETURNING * INTO v_tx;
    UPDATE public.listings SET status = 'active', updated_at = now()
    WHERE id = v_tx.listing_id AND status = 'sold';

  ELSIF p_action = 'admin_resolve' THEN
    IF NOT v_admin THEN RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501'; END IF;
    IF p_resolution NOT IN ('refunded', 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid resolution';
    END IF;
    IF v_tx.status <> 'disputed' THEN
      -- Disputes opened via the disputes table don't move the order; allow resolving from any live state.
      UPDATE public.transactions SET status = 'disputed' WHERE id = p_order_id
        AND status IN ('paid_in_escrow', 'shipped', 'delivered', 'completed');
    END IF;
    UPDATE public.transactions SET
      status = p_resolution,
      completed_at = CASE WHEN p_resolution = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END
    WHERE id = p_order_id RETURNING * INTO v_tx;
    IF p_resolution IN ('refunded', 'cancelled') THEN
      UPDATE public.listings SET status = 'active', updated_at = now()
      WHERE id = v_tx.listing_id AND status = 'sold';
    END IF;

  ELSE
    RAISE EXCEPTION 'Unknown action %', p_action;
  END IF;

  RETURN v_tx;
END;
$$;
REVOKE ALL ON FUNCTION public.order_action(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_action(uuid, text, text, text, text, text, text) TO authenticated;

-- Direct (P2P) payment attestations.
CREATE OR REPLACE FUNCTION public.confirm_direct_payment(p_order_id uuid)
RETURNS public.transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tx public.transactions;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_tx.buyer_id <> auth.uid() AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Only the buyer can confirm a direct payment' USING ERRCODE = '42501';
  END IF;
  IF v_tx.payment_method <> 'direct' THEN RAISE EXCEPTION 'Not a direct-payment order'; END IF;
  IF v_tx.status <> 'pending_payment' THEN RAISE EXCEPTION 'Only pending orders can be confirmed as paid'; END IF;
  UPDATE public.transactions SET
    status = 'paid_in_escrow', payment_confirmed = true, payment_confirmed_at = now()
  WHERE id = p_order_id RETURNING * INTO v_tx;
  RETURN v_tx;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_direct_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_direct_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_direct_payment_received(p_order_id uuid)
RETURNS public.transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tx public.transactions;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_tx.seller_id <> auth.uid() AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Only the seller can confirm payment received' USING ERRCODE = '42501';
  END IF;
  IF v_tx.payment_method <> 'direct' THEN RAISE EXCEPTION 'Not a direct-payment order'; END IF;
  IF v_tx.status <> 'paid_in_escrow' THEN RAISE EXCEPTION 'Buyer has not marked this order as paid'; END IF;
  IF v_tx.seller_confirmed_received_at IS NOT NULL THEN RAISE EXCEPTION 'Payment receipt already confirmed'; END IF;
  UPDATE public.transactions SET seller_confirmed_received_at = now()
  WHERE id = p_order_id RETURNING * INTO v_tx;
  RETURN v_tx;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_direct_payment_received(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_direct_payment_received(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Remove the direct write paths.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tx_insert_buyer" ON public.transactions;
DROP POLICY IF EXISTS "Transactions party update" ON public.transactions;
DROP POLICY IF EXISTS "tx_update_party" ON public.transactions;
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM anon, authenticated;

-- The old helper took the buyer id from the caller; orders now reserve the listing themselves.
REVOKE EXECUTE ON FUNCTION public.mark_listing_sold_for_order(uuid, uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 5. Unpaid orders expire so a buyer can't lock a listing forever.
--    Direct (P2P) orders get 24h; card checkout gets 45 minutes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  FOR r IN
    SELECT id, listing_id FROM public.transactions
    WHERE status = 'pending_payment'
      AND created_at < now() - CASE WHEN payment_method = 'direct' THEN interval '24 hours' ELSE interval '45 minutes' END
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.transactions SET status = 'cancelled' WHERE id = r.id;
    UPDATE public.listings SET status = 'active', updated_at = now()
    WHERE id = r.listing_id AND status = 'sold';
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-unpaid-orders');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('expire-unpaid-orders', '*/10 * * * *', $$SELECT public.expire_unpaid_orders()$$);
