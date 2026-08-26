-- Marketplace payment model: Stripe Connect (platform-mediated) + Direct/P2P.
-- Buyers pay either via Stripe Payment Element (escrow-style platform charge,
-- seller payout via Transfer to their Express account) or arrange payment
-- directly with the seller in chat (Binance-P2P style, unverified by platform).

-- ---------------------------------------------------------------------------
-- Seller payout identity (Stripe Connect Express)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_bank_last_digits text,
  ADD COLUMN IF NOT EXISTS payout_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Transaction payment/payout tracking
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe','direct')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_gateway_fee_thb numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending','transferred','failed')),
  ADD COLUMN IF NOT EXISTS payout_transfer_id text,
  ADD COLUMN IF NOT EXISTS receipt_photo_path text;

-- ---------------------------------------------------------------------------
-- Helper: mark a listing sold when a buyer creates an order.
-- Runs as SECURITY DEFINER so the buyer does not need listings UPDATE RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_listing_sold_for_order(p_listing_id uuid, p_buyer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
BEGIN
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not active';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE listing_id = p_listing_id
      AND buyer_id = p_buyer_id
      AND status IN ('pending_payment', 'paid_in_escrow')
  ) THEN
    RAISE EXCEPTION 'No matching order for this buyer';
  END IF;

  UPDATE public.listings
  SET status = 'sold', updated_at = now()
  WHERE id = p_listing_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Fix transactions UPDATE RLS: both buyer and seller (and admin) can drive
-- the order lifecycle. Application-level validation in api.ts still enforces
-- allowed status transitions.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Transactions seller update" ON public.transactions;
CREATE POLICY "Transactions party update"
  ON public.transactions FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets for receipt photos and dispute evidence
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipt-photos', 'receipt-photos', false, 10485760, ARRAY['image/*']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Parties read receipt photos" ON storage.objects;
CREATE POLICY "Parties read receipt photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipt-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT seller_id::text FROM public.transactions WHERE receipt_photo_path = name
        UNION
        SELECT buyer_id::text FROM public.transactions WHERE receipt_photo_path = name
      )
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "Buyer upload receipt photos" ON storage.objects;
CREATE POLICY "Buyer upload receipt photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipt-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dispute-evidence', 'dispute-evidence', false, 10485760, ARRAY['image/*']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Parties read dispute evidence" ON storage.objects;
CREATE POLICY "Parties read dispute evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-evidence'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT t.seller_id::text
        FROM public.disputes d
        JOIN public.transactions t ON t.id = d.transaction_id
        WHERE d.status <> 'resolved_buyer'
        UNION
        SELECT t.buyer_id::text
        FROM public.disputes d
        JOIN public.transactions t ON t.id = d.transaction_id
        WHERE d.status <> 'resolved_seller'
      )
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "Party upload dispute evidence" ON storage.objects;
CREATE POLICY "Party upload dispute evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );