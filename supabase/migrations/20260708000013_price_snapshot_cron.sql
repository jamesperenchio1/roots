-- Daily refresh of price snapshots so charts show a continuous line over time.
-- Runs every day at 03:00 UTC and recomputes today's snapshot for every
-- species/size bucket that is currently listed or has had a snapshot recently.

CREATE EXTENSION IF NOT EXISTS pg_cron;

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
END;
$$;

-- Idempotent schedule: remove any existing job with the same name, then create it.
DO $$
BEGIN
  PERFORM cron.unschedule('daily_price_snapshot_refresh');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily_price_snapshot_refresh',
  '0 3 * * *',
  'SELECT public.daily_refresh_all_price_snapshots();'
);
