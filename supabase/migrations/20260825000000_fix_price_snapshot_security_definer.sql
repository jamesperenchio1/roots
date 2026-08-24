-- price_snapshots is a service-write-only table (RLS denies all writes to
-- authenticated users), but refresh_price_snapshot() -- called from the
-- listings and transactions triggers on every insert/update -- was never
-- marked SECURITY DEFINER. As a result, any regular seller creating or
-- editing a listing hit a 403 "new row violates row-level security policy
-- for table price_snapshots", which broke listing creation entirely.

CREATE OR REPLACE FUNCTION public.refresh_price_snapshot(
  p_species_id text,
  p_size_category text,
  p_snapshot_date date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_prices numeric[];
  v_sale_prices numeric[];
  v_avg_asking numeric;
  v_median_price numeric;
  v_mean_price numeric;
  v_min_price numeric;
  v_max_price numeric;
  v_sale_count int;
  v_listing_count int;
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

  SELECT
    array_agg(sale_price_thb ORDER BY sale_price_thb),
    count(*)
  INTO v_sale_prices, v_sale_count
  FROM public.transactions
  WHERE status = 'completed'
    AND (
      listing_id IN (
        SELECT id FROM public.listings
        WHERE species_id = p_species_id
          AND (p_size_category IS NULL OR size_category = p_size_category)
      )
      OR species_label = p_species_id
    )
    AND (completed_at::date = p_snapshot_date OR created_at::date = p_snapshot_date);

  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY p),
    avg(p),
    min(p),
    max(p)
  INTO v_median_price, v_mean_price, v_min_price, v_max_price
  FROM (
    SELECT unnest(v_listing_prices) AS p
    UNION ALL
    SELECT unnest(v_sale_prices) AS p
  ) combined
  WHERE p IS NOT NULL;

  INSERT INTO public.price_snapshots (
    species_id,
    size_category,
    snapshot_date,
    median_price_thb,
    mean_price_thb,
    min_price_thb,
    max_price_thb,
    sale_count,
    listing_count,
    avg_asking_price,
    updated_at
  )
  VALUES (
    p_species_id,
    p_size_category,
    p_snapshot_date,
    v_median_price,
    round(v_mean_price),
    v_min_price,
    v_max_price,
    coalesce(v_sale_count, 0),
    coalesce(v_listing_count, 0),
    round(v_avg_asking),
    now()
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
END;
$$;
