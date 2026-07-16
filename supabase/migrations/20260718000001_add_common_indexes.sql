-- Add indexes for high-traffic query patterns that were missing or inefficient.

-- Offers: users load their own offers (buyer or seller), ordered by recency.
CREATE INDEX IF NOT EXISTS idx_offers_buyer_created
  ON public.offers (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_seller_created
  ON public.offers (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_listing_created
  ON public.offers (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_status
  ON public.offers (status, created_at DESC);

-- Public completed transaction feed ordered by completion time.
CREATE INDEX IF NOT EXISTS idx_transactions_status_completed_at
  ON public.transactions (status, completed_at DESC NULLS LAST);

-- Active listings filtered by category or province in the browse UI.
CREATE INDEX IF NOT EXISTS idx_listings_status_category_created
  ON public.listings (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status_province_created
  ON public.listings (status, pickup_province, created_at DESC);
