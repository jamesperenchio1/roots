-- Boost v1: paid listing visibility (platform ad revenue, separate from
-- marketplace transactions). A seller pays a small fee via Stripe to have
-- their listing sorted higher / shown in a "Featured" rail for a fixed
-- number of hours (see src/lib/boost.ts BOOST_TIERS for the discrete tier
-- list). This always uses Stripe regardless of STRIPE_CHECKOUT_ENABLED --
-- that flag only gates the buyer/seller marketplace checkout path.

-- 1. Track how long a listing stays boosted.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS boosted_until timestamptz;

-- 2. Audit / idempotency ledger for boost purchases. Stripe webhooks can be
-- delivered more than once, so we need a durable record of what was
-- purchased (and its status) to make extending boosted_until idempotent.
CREATE TABLE IF NOT EXISTS public.listing_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_thb integer NOT NULL,
  duration_hours integer NOT NULL,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.listing_boosts IS 'Audit/idempotency ledger for Stripe-paid listing boosts (platform ad revenue). Written only by the stripe-boost-checkout and stripe-webhook edge functions via the service-role client.';

ALTER TABLE public.listing_boosts ENABLE ROW LEVEL SECURITY;

-- Sellers can read their own boost purchase history. No public read at all --
-- this is billing/audit data, not marketplace content.
DROP POLICY IF EXISTS "Listing boosts view own" ON public.listing_boosts;
CREATE POLICY "Listing boosts view own"
  ON public.listing_boosts FOR SELECT
  USING (seller_id = auth.uid() OR public.is_app_admin());

-- All writes are service-role only (inserted/updated by the stripe-boost-checkout
-- and stripe-webhook edge functions, which use the service-role client and so
-- bypass RLS entirely). Regular users, including the owning seller, cannot
-- write directly -- mirrors the locked-down style used for price_snapshots.
DROP POLICY IF EXISTS "Listing boosts service-write only" ON public.listing_boosts;
CREATE POLICY "Listing boosts service-write only"
  ON public.listing_boosts FOR ALL
  USING (false)
  WITH CHECK (false);

-- 3. Index for the "currently boosted" lookups used by boost-aware sorting
-- and the homepage Featured rail (WHERE boosted_until > now()).
CREATE INDEX IF NOT EXISTS idx_listings_boosted_until
  ON public.listings(boosted_until) WHERE boosted_until IS NOT NULL;
