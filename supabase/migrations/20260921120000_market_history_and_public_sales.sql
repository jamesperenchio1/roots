-- Market data cleanup + a public, non-sensitive view of completed sales.
--
-- Note: price_snapshots already has a partial unique index covering the
-- "all sizes" rows (idx_price_snapshots_null_size_unique, added by the
-- out-of-band fix_price_snapshot_null_size_uniqueness migration), and the
-- 90-day history backfill already exists, so neither is repeated here.

-- 1. Drop rows that carry no price information at all -----------------------
-- refresh_price_snapshot() writes a row even when nothing is in scope, which
-- maps to 0 client-side and renders as a 0-price point on charts.
DELETE FROM public.price_snapshots
WHERE median_price_thb IS NULL
  AND mean_price_thb IS NULL
  AND sale_count = 0
  AND listing_count = 0;

-- 2. Public completed-sales view -------------------------------------------
-- "High value sales" reads this with the anon client, but RLS on
-- public.transactions only allows the buyer, seller or an admin, so anonymous
-- visitors always saw an empty table. The view is owned by the migration role
-- (so it reads past RLS), embeds the linked listing as JSON because PostgREST
-- cannot infer a relationship from a view, and omits buyer identity.
CREATE OR REPLACE VIEW public.public_completed_sales AS
SELECT
  t.id,
  t.listing_id,
  t.species_label,
  t.image_url,
  t.sale_price_thb,
  t.platform_fee_thb,
  t.seller_payout_thb,
  t.status,
  t.delivery_method,
  t.tracking_number,
  t.courier,
  t.payment_confirmed,
  t.created_at,
  t.completed_at,
  t.seller_id,
  to_jsonb(l) AS listings
FROM public.transactions t
LEFT JOIN public.listings l ON l.id = t.listing_id
WHERE t.status = 'completed';

COMMENT ON VIEW public.public_completed_sales IS
  'Public, read-only projection of completed sales for market pages. Omits buyer identity.';

GRANT SELECT ON public.public_completed_sales TO anon, authenticated;
