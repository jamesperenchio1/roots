-- One-time backfill: compute today's price snapshot for every active listing
-- species/size bucket so existing listings have a data point immediately.
SELECT public.daily_refresh_all_price_snapshots();
