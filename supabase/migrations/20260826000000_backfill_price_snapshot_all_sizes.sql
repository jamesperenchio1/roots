-- Ensure the "All Sizes" price charts work by backfilling and maintaining
-- size_category IS NULL aggregate rows (per species, per snapshot date).
--
-- The "All Sizes" chart (MarketPage) queries price_snapshots with
-- size_category IS NULL. Triggers and the daily cron only refreshed the
-- specific size buckets found on listings, so aggregate rows were never
-- created on the remote database. This migration:
--   1. Updates daily_refresh_all_price_snapshots() to also emit a NULL
--      size_category aggregate row for every distinct species seen, and
--   2. Backfills NULL aggregate rows for every existing species/date pair.

CREATE OR REPLACE FUNCTION public.daily_refresh_all_price_snapshots()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT species_id, size_category
    FROM public.listings
    WHERE status = 'active'
      AND species_id IS NOT NULL
    UNION
    SELECT DISTINCT species_id, size_category
    FROM public.price_snapshots
    WHERE snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
  LOOP
    PERFORM public.refresh_price_snapshot(rec.species_id, rec.size_category, CURRENT_DATE);
  END LOOP;

  -- Emit the all-sizes aggregate (size_category IS NULL) for every species
  -- that is currently active or has recent snapshots.
  FOR rec IN
    SELECT DISTINCT species_id
    FROM public.listings
    WHERE status = 'active'
      AND species_id IS NOT NULL
    UNION
    SELECT DISTINCT species_id
    FROM public.price_snapshots
    WHERE snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
  LOOP
    PERFORM public.refresh_price_snapshot(rec.species_id, NULL, CURRENT_DATE);
  END LOOP;
END;
$$;

-- Backfill all-sizes aggregate rows for every existing species/date pair.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT species_id, snapshot_date FROM public.price_snapshots LOOP
    PERFORM public.refresh_price_snapshot(r.species_id, NULL, r.snapshot_date);
  END LOOP;
END $$;