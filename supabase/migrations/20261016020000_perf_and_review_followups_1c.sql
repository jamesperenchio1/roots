-- 1c: review follow-ups for 1b (storage path validation) + database performance.

-- ---------------------------------------------------------------------------
-- A. Private-file paths are validated and stored as bare object names.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_private_path(p_bucket text, p_value text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT regexp_replace(p_value, '^.*/' || p_bucket || '/', '')
$$;

-- Evidence must live in the opener's own folder, so a dispute can't reference someone else's files.
CREATE OR REPLACE FUNCTION public.validate_dispute_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  u text;
  v_path text;
  v_cleaned text[] := '{}';
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN RETURN NEW; END IF;
  IF COALESCE(array_length(NEW.evidence_urls, 1), 0) > 5 THEN
    RAISE EXCEPTION 'At most 5 evidence files';
  END IF;
  FOREACH u IN ARRAY COALESCE(NEW.evidence_urls, '{}') LOOP
    v_path := public.normalize_private_path('dispute-evidence', u);
    IF v_path !~ ('^' || auth.uid()::text || '/[A-Za-z0-9._-]+$') OR v_path LIKE '%..%' THEN
      RAISE EXCEPTION 'Invalid evidence file';
    END IF;
    v_cleaned := v_cleaned || v_path;
  END LOOP;
  NEW.evidence_urls := v_cleaned;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_dispute_evidence ON public.disputes;
CREATE TRIGGER validate_dispute_evidence
  BEFORE INSERT OR UPDATE OF evidence_urls ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.validate_dispute_evidence();

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
          AND objects.name = ANY (d.evidence_urls)
      )
      OR public.is_app_admin()
    )
  );

-- order_action: receipt path must be a bare object in the buyer's own folder.
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
  v_receipt text;
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
    IF p_receipt_photo_path IS NOT NULL THEN
      v_receipt := public.normalize_private_path('receipt-photos', p_receipt_photo_path);
      IF v_receipt !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]+$') OR v_receipt LIKE '%..%' THEN
        RAISE EXCEPTION 'Invalid receipt file';
      END IF;
    END IF;
    IF v_tx.status = 'shipped' THEN
      UPDATE public.transactions SET status = 'delivered', delivered_at = now() WHERE id = p_order_id;
    END IF;
    UPDATE public.transactions SET
      status = 'completed', completed_at = now(),
      receipt_photo_path = COALESCE(v_receipt, receipt_photo_path)
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
      RAISE EXCEPTION 'Order is already %', v_tx.status;
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

-- ---------------------------------------------------------------------------
-- B. Triggers: stop recomputing price snapshots / transfers on every row update.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS listings_price_snapshot_trigger ON public.listings;
CREATE TRIGGER listings_price_snapshot_ins AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.price_snapshot_from_listing();
CREATE TRIGGER listings_price_snapshot_del AFTER DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.price_snapshot_from_listing();
CREATE TRIGGER listings_price_snapshot_upd
  AFTER UPDATE OF species_id, size_category, price_thb, status ON public.listings
  FOR EACH ROW
  WHEN (OLD.species_id IS DISTINCT FROM NEW.species_id
     OR OLD.size_category IS DISTINCT FROM NEW.size_category
     OR OLD.price_thb IS DISTINCT FROM NEW.price_thb
     OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.price_snapshot_from_listing();

DROP TRIGGER IF EXISTS transactions_price_snapshot_trigger ON public.transactions;
CREATE TRIGGER transactions_price_snapshot_trigger
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.price_snapshot_from_transaction();

-- Transfers: once per completed order, idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS transfers_transaction_uniq
  ON public.transfers (transaction_id) WHERE transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_transfer_on_completion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
  IF v_listing.plant_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.transfers (plant_id, from_user_id, to_user_id, transaction_id, sale_price_thb, transferred_at)
  VALUES (v_listing.plant_id, NEW.seller_id, NEW.buyer_id, NEW.id, NEW.sale_price_thb, COALESCE(NEW.completed_at, now()))
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    UPDATE public.plants SET current_owner_id = NEW.buyer_id, updated_at = now()
    WHERE id = v_listing.plant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_transfer_trigger ON public.transactions;
CREATE TRIGGER transactions_transfer_trigger
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.record_transfer_on_completion();

-- Duplicate guard trigger.
DROP TRIGGER IF EXISTS trg_guard_payment_confirmed ON public.transactions;

-- Message audit trigger ran as the invoker and could not write audit_logs (no INSERT policy).
CREATE OR REPLACE FUNCTION public.audit_message_changes()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       NEW.content IS DISTINCT FROM OLD.content
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
  ) THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'message_updated', 'messages', NEW.id,
            jsonb_build_object('content', OLD.content, 'deleted_at', OLD.deleted_at),
            jsonb_build_object('content', NEW.content, 'deleted_at', NEW.deleted_at));
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- C. RLS helper cost: stable, one call per statement where possible.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_app_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = uid), false)
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conv_id AND cp.user_id = uid AND cp.left_at IS NULL
  )
$$;

-- Wrap bare auth.uid() in (select auth.uid()) across public policies so Postgres
-- evaluates it once per statement instead of once per row.
DO $$
DECLARE
  r record;
  v_using text;
  v_check text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS tablename, pol.polname,
           pg_get_expr(pol.polqual, pol.polrelid) AS q,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS wc
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '') ~ 'auth\.uid\(\)'
        OR COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ~ 'auth\.uid\(\)')
      AND COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '') !~* 'select auth\.uid'
      AND COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '') !~* 'select auth\.uid'
  LOOP
    v_using := CASE WHEN r.q IS NULL THEN NULL ELSE replace(r.q, 'auth.uid()', '(SELECT auth.uid())') END;
    v_check := CASE WHEN r.wc IS NULL THEN NULL ELSE replace(r.wc, 'auth.uid()', '(SELECT auth.uid())') END;
    v_sql := format('ALTER POLICY %I ON %I.%I', r.polname, r.schemaname, r.tablename);
    IF v_using IS NOT NULL THEN v_sql := v_sql || ' USING (' || v_using || ')'; END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || ' WITH CHECK (' || v_check || ')'; END IF;
    EXECUTE v_sql;
  END LOOP;
END $$;

-- Duplicate permissive policies (each is evaluated on every query).
DROP POLICY IF EXISTS "offers_select_own" ON public.offers;
DROP POLICY IF EXISTS "offers_update_parties" ON public.offers;
DROP POLICY IF EXISTS "Watchlist delete own" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist insert own" ON public.watchlist;
DROP POLICY IF EXISTS "Watchlist select own" ON public.watchlist;

-- ---------------------------------------------------------------------------
-- D. Indexes for the hot paths (search, lists, chat membership).
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS listings_species_en_trgm ON public.listings USING gin (species_common_en extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_species_th_trgm ON public.listings USING gin (species_common_th extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_species_sci_trgm ON public.listings USING gin (species_scientific extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_active_price_idx ON public.listings (price_thb) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS listings_active_created_idx ON public.listings (created_at DESC, id DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS listings_species_status_idx ON public.listings (species_id, status);
CREATE INDEX IF NOT EXISTS conversation_participants_active_user_idx
  ON public.conversation_participants (user_id, conversation_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm ON public.profiles USING gin (display_name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- E. Cron hygiene: one email-queue job (the other duplicate never authenticated).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('send-notification-email');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
