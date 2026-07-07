CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_price_thb integer NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  counter_price_thb integer,
  conversation_id uuid,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Sellers and buyers can see their own offers.
DROP POLICY IF EXISTS offers_select_own ON public.offers;
CREATE POLICY offers_select_own
  ON public.offers
  FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Buyers can insert offers.
DROP POLICY IF EXISTS offers_insert_buyer ON public.offers;
CREATE POLICY offers_insert_buyer
  ON public.offers
  FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Both parties can update offers they participate in (accept/reject/counter/withdraw).
DROP POLICY IF EXISTS offers_update_parties ON public.offers;
CREATE POLICY offers_update_parties
  ON public.offers
  FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());
