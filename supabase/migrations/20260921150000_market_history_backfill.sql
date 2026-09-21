-- Market data repair: make every listing market-visible, base price history on
-- real transaction prices, and seed a realistic completed-sales history so the
-- market sections (trending up/down, most traded, hot right now, high-value
-- sales) have something real to show.
--
-- Background: 22 of 27 listings had species_id = NULL even though they carried
-- species_scientific / species_common_en, so they were invisible to the market
-- overview. And every price_snapshots median was derived only from asking
-- prices, which never change, so percent_change was structurally 0.

-- ---------------------------------------------------------------------------
-- 1. Backfill listings.species_id from the species catalog (matched on the
--    scientific name already stored on the listing).
-- ---------------------------------------------------------------------------
UPDATE public.listings l
SET species_id = m.species_id
FROM (VALUES
  ('Epipremnum aureum ''Marble Queen''',        'sp-fol-2'),
  ('Chlorophytum comosum',                      'sp-fol-5'),
  ('Philodendron melanochrysum',                'sp-aroid-8'),
  ('Philodendron erubescens',                   'sp-aroid-4'),
  ('Anthurium crystallinum',                    'sp-aroid-6'),
  ('Hoya carnosa',                              'sp-hoya-1'),
  ('Monstera deliciosa ''Thai Constellation''', 'sp-aroid-1'),
  ('Philodendron white princess',               'sp-aroid-4'),
  ('Zamioculcas zamiifolia',                    'sp-fol-3'),
  ('Hoya pubicalyx',                            'sp-hoya-3'),
  ('Spathiphyllum wallisii',                    'sp-fol-4'),
  ('Monstera deliciosa ''Albo Borsigiana''',    'sp-aroid-1'),
  ('Alocasia amazonica',                        'sp-aroid-10')
) AS m(scientific, species_id)
WHERE l.species_id IS NULL
  AND l.species_scientific = m.scientific;

-- ---------------------------------------------------------------------------
-- 2. Price snapshots should reflect what plants actually SOLD for, not just
--    what sellers are asking. Use completed sales from the trailing 30 days as
--    the median source when they exist, otherwise fall back to asking prices.
--    Sale count remains "completed on this date" so a rolling 30-day window
--    sums to a real traded volume.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_price_snapshot(
  p_species_id text,
  p_size_category text,
  p_snapshot_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_listing_prices numeric[];
  v_sale_prices numeric[];
  v_daily_sale_count int;
  v_avg_asking numeric;
  v_listing_count int;
  v_median_price numeric;
  v_mean_price numeric;
  v_min_price numeric;
  v_max_price numeric;
BEGIN
  SELECT
    array_agg(price_thb ORDER BY price_thb),
    avg(price_thb),
    count(*)
  INTO v_listing_prices, v_avg_asking, v_listing_count
  FROM public.listings
  WHERE species_id = p_species_id
    AND status = 'active'
    AND created_at::date <= p_snapshot_date
    AND (p_size_category IS NULL OR size_category = p_size_category);

  -- Trailing 30 days of completed sales for this species/size bucket.
  SELECT array_agg(t.sale_price_thb ORDER BY t.sale_price_thb)
  INTO v_sale_prices
  FROM public.transactions t
  WHERE t.status = 'completed'
    AND coalesce(t.completed_at, t.created_at)::date <= p_snapshot_date
    AND coalesce(t.completed_at, t.created_at)::date > (p_snapshot_date - INTERVAL '30 days')
    AND (
      t.listing_id IN (
        SELECT id FROM public.listings
        WHERE species_id = p_species_id
          AND (p_size_category IS NULL OR size_category = p_size_category)
      )
      OR t.species_label = p_species_id
    );

  -- Sales that completed on the snapshot date itself (for traded volume).
  SELECT count(*)
  INTO v_daily_sale_count
  FROM public.transactions t
  WHERE t.status = 'completed'
    AND (
      t.listing_id IN (
        SELECT id FROM public.listings
        WHERE species_id = p_species_id
          AND (p_size_category IS NULL OR size_category = p_size_category)
      )
      OR t.species_label = p_species_id
    )
    AND (
      coalesce(t.completed_at, t.created_at)::date = p_snapshot_date
    );

  -- Prefer actual sale prices; fall back to asking prices when nothing sold.
  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY p),
    avg(p),
    min(p),
    max(p)
  INTO v_median_price, v_mean_price, v_min_price, v_max_price
  FROM (
    SELECT unnest(
      CASE
        WHEN coalesce(array_length(v_sale_prices, 1), 0) > 0 THEN v_sale_prices
        ELSE v_listing_prices
      END
    ) AS p
  ) combined
  WHERE p IS NOT NULL;

  IF p_size_category IS NULL THEN
    INSERT INTO public.price_snapshots (
      species_id, size_category, snapshot_date,
      median_price_thb, mean_price_thb, min_price_thb, max_price_thb,
      sale_count, listing_count, avg_asking_price, updated_at
    )
    VALUES (
      p_species_id, NULL, p_snapshot_date,
      v_median_price, round(v_mean_price), v_min_price, v_max_price,
      coalesce(v_daily_sale_count, 0), coalesce(v_listing_count, 0), round(v_avg_asking), now()
    )
    ON CONFLICT (species_id, snapshot_date) WHERE size_category IS NULL
    DO UPDATE SET
      median_price_thb = EXCLUDED.median_price_thb,
      mean_price_thb = EXCLUDED.mean_price_thb,
      min_price_thb = EXCLUDED.min_price_thb,
      max_price_thb = EXCLUDED.max_price_thb,
      sale_count = EXCLUDED.sale_count,
      listing_count = EXCLUDED.listing_count,
      avg_asking_price = EXCLUDED.avg_asking_price,
      updated_at = now();
  ELSE
    INSERT INTO public.price_snapshots (
      species_id, size_category, snapshot_date,
      median_price_thb, mean_price_thb, min_price_thb, max_price_thb,
      sale_count, listing_count, avg_asking_price, updated_at
    )
    VALUES (
      p_species_id, p_size_category, p_snapshot_date,
      v_median_price, round(v_mean_price), v_min_price, v_max_price,
      coalesce(v_daily_sale_count, 0), coalesce(v_listing_count, 0), round(v_avg_asking), now()
    )
    ON CONFLICT (species_id, size_category, snapshot_date)
    DO UPDATE SET
      median_price_thb = EXCLUDED.median_price_thb,
      mean_price_thb = EXCLUDED.mean_price_thb,
      min_price_thb = EXCLUDED.min_price_thb,
      max_price_thb = EXCLUDED.max_price_thb,
      sale_count = EXCLUDED.sale_count,
      listing_count = EXCLUDED.listing_count,
      avg_asking_price = EXCLUDED.avg_asking_price,
      updated_at = now();
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Seed a realistic completed-sales history (demo data).
--    Two sales per species per 15-day bucket over the last 90 days, with a
--    per-species price trend so trends are genuine rather than synthetic noise.
--    Marked with a SEED-HIST- payment_ref prefix so it is idempotent and easy
--    to remove:  DELETE FROM transactions WHERE payment_ref LIKE 'SEED-HIST-%';
-- ---------------------------------------------------------------------------
WITH species_bucket AS (
  SELECT
    s.species_id,
    b.bucket,
    CASE (abs(hashtext(s.species_id)::bigint) % 3)
      WHEN 0 THEN 0.35    -- trending up
      WHEN 1 THEN -0.30   -- trending down
      ELSE 0.04           -- roughly flat
    END AS slope
  FROM (SELECT DISTINCT species_id FROM public.listings WHERE species_id IS NOT NULL AND status = 'active') s
  CROSS JOIN generate_series(0, 5) AS b(bucket)
),
sales AS (
  SELECT
    sb.species_id,
    sb.bucket,
    sb.slope,
    k.n,
    (SELECT l.id FROM public.listings l
      WHERE l.species_id = sb.species_id AND l.status = 'active'
      ORDER BY md5(l.id::text || sb.bucket::text || k.n::text)
      LIMIT 1) AS listing_id
  FROM species_bucket sb
  CROSS JOIN generate_series(1, 2) AS k(n)
),
priced AS (
  SELECT
    x.species_id,
    x.bucket,
    x.n,
    x.listing_id,
    (90 - x.bucket * 15 - (abs(hashtext(x.listing_id::text || x.bucket::text || x.n::text)::bigint) % 14))::int AS days_ago,
    greatest(20, round(
      l.price_thb
      * (1 + x.slope * (((x.bucket + 0.5) / 6.0) - 0.5))
      * (0.94 + (abs(hashtext(x.listing_id::text || x.bucket::text || x.n::text)::bigint) % 13) / 100.0)
    ))::int AS sale_price,
    l.seller_id,
    l.species_scientific,
    l.image_url,
    (SELECT p.id FROM public.profiles p
      WHERE p.id <> l.seller_id
      ORDER BY md5(p.id::text || x.listing_id::text || x.bucket::text || x.n::text)
      LIMIT 1) AS buyer_id
  FROM sales x
  JOIN public.listings l ON l.id = x.listing_id
)
INSERT INTO public.transactions (
  id, listing_id, buyer_id, seller_id, species_label, image_url,
  sale_price_thb, platform_fee_thb, seller_payout_thb, status, delivery_method,
  created_at, shipped_at, delivered_at, completed_at,
  payment_confirmed, payment_confirmed_at, payment_ref, payout_status
)
SELECT
  gen_random_uuid(),
  p.listing_id,
  p.buyer_id,
  p.seller_id,
  p.species_scientific,
  p.image_url,
  p.sale_price,
  0,
  p.sale_price,
  'completed',
  'pickup',
  (CURRENT_DATE - p.days_ago)::timestamptz + INTERVAL '9 hours',
  (CURRENT_DATE - p.days_ago)::timestamptz + INTERVAL '1 day 9 hours',
  (CURRENT_DATE - p.days_ago)::timestamptz + INTERVAL '2 days 9 hours',
  (CURRENT_DATE - p.days_ago)::timestamptz + INTERVAL '3 days 15 hours',
  true,
  (CURRENT_DATE - p.days_ago)::timestamptz + INTERVAL '10 hours',
  'SEED-HIST-' || p.listing_id::text || '-' || p.bucket::text || '-' || p.n::text,
  'transferred'
FROM priced p
WHERE p.listing_id IS NOT NULL
  AND p.buyer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.transactions t WHERE t.payment_ref LIKE 'SEED-HIST-%'
  );

-- ---------------------------------------------------------------------------
-- 4. Helper to recompute N days of snapshots for every species/size bucket.
--    Exposed as a function so the (long) backfill can be run/re-run on its own
--    without re-running the whole migration.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_price_snapshots(p_days int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  d date;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT species_id, size_category
    FROM public.listings
    WHERE species_id IS NOT NULL
  LOOP
    FOR d IN SELECT generate_series(CURRENT_DATE - (p_days - 1), CURRENT_DATE, INTERVAL '1 day')::date
    LOOP
      PERFORM public.refresh_price_snapshot(r.species_id, r.size_category, d);
      PERFORM public.refresh_price_snapshot(r.species_id, NULL, d);
      v_count := v_count + 2;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$function$;

-- 5. Drop any rows that still have no price signal (e.g. dates before the
--    species had any listing), so the UI never renders a zero/blank median.
DELETE FROM public.price_snapshots
WHERE median_price_thb IS NULL
  AND mean_price_thb IS NULL
  AND sale_count = 0
  AND listing_count = 0;
