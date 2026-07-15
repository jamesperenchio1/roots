-- Aggregate per-species snapshots across all sizes so "All Sizes" charts are clean.
-- Previously the "All Sizes" view mixed S/M/L/XL points, producing jagged charts.

-- 1. Update refresh function so NULL size_category means "aggregate across sizes".
CREATE OR REPLACE FUNCTION public.refresh_price_snapshot(
  p_species_id text,
  p_size_category text,
  p_snapshot_date date
) RETURNS void
LANGUAGE plpgsql
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
  -- Gather active listing prices for this species/size/date window.
  -- When p_size_category IS NULL, aggregate across all sizes.
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

  -- Gather completed sale prices for this species/size/date window.
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

  -- Compute combined stats from both listings and sales.
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

-- 2. Update listing trigger to also refresh the all-sizes aggregate.
CREATE OR REPLACE FUNCTION public.price_snapshot_from_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_species_id text;
  v_size_category text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_species_id := OLD.species_id;
    v_size_category := OLD.size_category;
  ELSE
    v_species_id := NEW.species_id;
    v_size_category := NEW.size_category;
  END IF;

  IF v_species_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Refresh specific size bucket.
  PERFORM public.refresh_price_snapshot(v_species_id, v_size_category, CURRENT_DATE);
  -- Refresh all-sizes aggregate.
  PERFORM public.refresh_price_snapshot(v_species_id, NULL, CURRENT_DATE);

  -- If this was an update that changed species or size, refresh the old buckets too.
  IF TG_OP = 'UPDATE' AND (
    OLD.species_id IS DISTINCT FROM NEW.species_id
    OR OLD.size_category IS DISTINCT FROM NEW.size_category
  ) THEN
    PERFORM public.refresh_price_snapshot(OLD.species_id, OLD.size_category, CURRENT_DATE);
    PERFORM public.refresh_price_snapshot(OLD.species_id, NULL, CURRENT_DATE);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Update transaction trigger to also refresh the all-sizes aggregate.
CREATE OR REPLACE FUNCTION public.price_snapshot_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_species_id text;
  v_size_category text;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT species_id, size_category
  INTO v_species_id, v_size_category
  FROM public.listings
  WHERE id = NEW.listing_id;

  IF v_species_id IS NULL THEN
    v_species_id := NEW.species_label;
    v_size_category := 'M';
  END IF;

  PERFORM public.refresh_price_snapshot(v_species_id, v_size_category, CURRENT_DATE);
  PERFORM public.refresh_price_snapshot(v_species_id, NULL, CURRENT_DATE);

  RETURN NEW;
END;
$$;

-- 4. Backfill all-sizes aggregates for every existing species/date pair.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT species_id, snapshot_date FROM public.price_snapshots LOOP
    PERFORM public.refresh_price_snapshot(r.species_id, NULL, r.snapshot_date);
  END LOOP;
END $$;
