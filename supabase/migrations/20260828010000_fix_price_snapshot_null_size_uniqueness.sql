-- Fix a pre-existing bug in refresh_price_snapshot() (see
-- 20260825000000_fix_price_snapshot_security_definer.sql for the canonical
-- version this migration replaces): price_snapshots has
-- UNIQUE (species_id, size_category, snapshot_date) where size_category is
-- nullable. Postgres/SQL-standard uniqueness treats each NULL as distinct
-- from every other NULL, so two rows sharing the same species_id/
-- snapshot_date and both size_category = NULL do NOT violate this
-- constraint -- they're two separate rows as far as the unique index is
-- concerned.
--
-- refresh_price_snapshot() does INSERT ... ON CONFLICT (species_id,
-- size_category, snapshot_date) DO UPDATE. When called with
-- p_size_category = NULL (the "all sizes" aggregate row used by the Market
-- page's "All Sizes" chart), this ON CONFLICT clause never matches an
-- existing NULL row, so every call inserts a brand new duplicate row
-- instead of updating the existing one. This is hit on ordinary
-- marketplace activity: price_snapshot_from_listing() and
-- price_snapshot_from_transaction() (20260717000002) call
-- refresh_price_snapshot(species, NULL, CURRENT_DATE) on every
-- listing/transaction write, and daily_refresh_all_price_snapshots()
-- (20260826000000) calls it once per species per day via pg_cron. Any
-- species with two or more of these events on the same day accumulates
-- duplicate size_category IS NULL rows for that date.
--
-- Fix: add a partial unique index covering the NULL case, and make
-- refresh_price_snapshot() route through the correct ON CONFLICT target
-- depending on whether p_size_category is NULL. A single INSERT's conflict
-- target is fixed at parse time and can't be conditional on a runtime
-- value (verified against a live Postgres 16 instance while writing this
-- migration -- attempting a single statement with a conflict target that
-- covers both the 3-column unique constraint and the 2-column partial
-- index is not valid syntax), so the function branches into two separate
-- INSERT ... ON CONFLICT statements, one per case.

-- Step 1: deduplicate any existing duplicate NULL rows the bug has already
-- produced in the live table before adding the new unique index (the
-- CREATE UNIQUE INDEX below will fail if duplicates remain). Keep the row
-- with the most recently touched updated_at (most likely to reflect the
-- latest correct data); break ties by ctid for a deterministic result.
DELETE FROM public.price_snapshots a
USING public.price_snapshots b
WHERE a.size_category IS NULL
  AND b.size_category IS NULL
  AND a.species_id = b.species_id
  AND a.snapshot_date = b.snapshot_date
  AND (
    a.updated_at < b.updated_at
    OR (a.updated_at = b.updated_at AND a.ctid < b.ctid)
  );

-- Step 2: partial unique index covering the size_category IS NULL case.
-- The existing UNIQUE (species_id, size_category, snapshot_date) constraint
-- (see the price_snapshots table definition) is left in place unchanged
-- and continues to correctly enforce uniqueness for non-NULL size_category
-- rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_null_size_unique
  ON public.price_snapshots (species_id, snapshot_date)
  WHERE size_category IS NULL;

-- Step 3: route refresh_price_snapshot()'s upsert through the correct
-- conflict target. Every other line of logic is reproduced unchanged from
-- 20260825000000_fix_price_snapshot_security_definer.sql; only the final
-- INSERT ... ON CONFLICT is changed, split into two branches.
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

  IF p_size_category IS NULL THEN
    -- No 3-column unique constraint can match a NULL size_category row
    -- (NULL <> NULL), so this branch targets the partial unique index
    -- created above instead.
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
      NULL,
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
  END IF;
END;
$$;
