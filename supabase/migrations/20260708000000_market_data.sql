-- Market data snapshot table and incremental refresh triggers.
-- Only the snapshot for the affected species/size/today is recomputed.

CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id text NOT NULL,
  size_category text,
  snapshot_date date NOT NULL,
  median_price_thb numeric,
  mean_price_thb numeric,
  min_price_thb numeric,
  max_price_thb numeric,
  sale_count int NOT NULL DEFAULT 0,
  listing_count int NOT NULL DEFAULT 0,
  avg_asking_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (species_id, size_category, snapshot_date)
);

COMMENT ON TABLE public.price_snapshots IS 'Daily aggregated market stats per species/size. Recalculated incrementally by triggers.';

-- Enable RLS
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access for market pages
CREATE POLICY "Price snapshots are publicly readable"
  ON public.price_snapshots
  FOR SELECT
  USING (true);

-- Only service role / triggers can write; regular users cannot.
-- (Supabase service role bypasses RLS; triggers run as owner.)
CREATE POLICY "Price snapshots are service-write only"
  ON public.price_snapshots
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Helper: refresh a single snapshot from active listings + completed transactions.
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
  SELECT
    array_agg(price_thb ORDER BY price_thb),
    avg(price_thb),
    count(*)
  INTO v_listing_prices, v_avg_asking, v_listing_count
  FROM public.listings
  WHERE species_id = p_species_id
    AND size_category = p_size_category
    AND status = 'active'
    AND created_at::date <= p_snapshot_date;

  -- Gather completed sale prices for this species/size/date window.
  SELECT
    array_agg(sale_price_thb ORDER BY sale_price_thb),
    count(*)
  INTO v_sale_prices, v_sale_count
  FROM public.transactions
  WHERE status = 'completed'
    AND (
      -- Prefer species_id stored on the listing referenced by the transaction.
      listing_id IN (
        SELECT id FROM public.listings
        WHERE species_id = p_species_id
          AND size_category = p_size_category
      )
      -- Fallback: species_label exact match for transactions without a linked species_id.
      OR species_label = p_species_id
    )
    AND (completed_at::date = p_snapshot_date OR created_at::date = p_snapshot_date);

  -- Compute combined stats from both listings and sales.
  -- For the market price history, we want the median of all current asking prices
  -- and completed sales together so the chart reflects real market value even
  -- before many sales exist.
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

-- Trigger: recompute snapshot when a listing changes.
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

  PERFORM public.refresh_price_snapshot(v_species_id, v_size_category, CURRENT_DATE);

  -- If this was an update that changed species or size, refresh the old bucket too.
  IF TG_OP = 'UPDATE' AND (
    OLD.species_id IS DISTINCT FROM NEW.species_id
    OR OLD.size_category IS DISTINCT FROM NEW.size_category
  ) THEN
    PERFORM public.refresh_price_snapshot(OLD.species_id, OLD.size_category, CURRENT_DATE);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS listings_price_snapshot_trigger ON public.listings;
CREATE TRIGGER listings_price_snapshot_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.price_snapshot_from_listing();

-- Trigger: recompute snapshot when a transaction completes.
CREATE OR REPLACE FUNCTION public.price_snapshot_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_species_id text;
  v_size_category text;
BEGIN
  -- Only react when a transaction becomes completed (or is updated while completed).
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Resolve species/size from the linked listing.
  SELECT species_id, size_category
  INTO v_species_id, v_size_category
  FROM public.listings
  WHERE id = NEW.listing_id;

  IF v_species_id IS NULL THEN
    v_species_id := NEW.species_label;
    v_size_category := 'M';
  END IF;

  PERFORM public.refresh_price_snapshot(v_species_id, v_size_category, CURRENT_DATE);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_price_snapshot_trigger ON public.transactions;
CREATE TRIGGER transactions_price_snapshot_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.price_snapshot_from_transaction();

-- Index for common lookups.
CREATE INDEX IF NOT EXISTS idx_price_snapshots_species_date
  ON public.price_snapshots(species_id, size_category, snapshot_date DESC);
