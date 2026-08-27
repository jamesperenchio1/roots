-- Backfill a year of historical price_snapshots data.
--
-- Problem: refresh_price_snapshot() (see 20260825000000) and
-- daily_refresh_all_price_snapshots() (see 20260826000000) have only ever
-- been called for CURRENT_DATE -- by the listings/transactions triggers, by
-- the daily pg_cron job, and by scripts/seed-database.cjs. scripts/seed-database.cjs
-- does seed backdated *transactions* (5-120 days in the past), which is real
-- historical signal that has never been turned into price_snapshots rows.
-- Net effect: every species/size has at most one snapshot row (today's), so
-- every price chart is flat/empty and every percent-change-based bucket
-- (trending up/down, hot, cold) is permanently empty.
--
-- Naively calling refresh_price_snapshot() for every past day is not enough
-- on its own: for a day with no real completed transaction, the function's
-- asking-price component is derived from *today's* currently-active
-- listings (the same listings on every day), so the computed median barely
-- moves day to day. So this backfill uses two paths per day per
-- species/size combo:
--   * Real data path: if a real completed transaction exists for that
--     species/size on that specific day (identical matching logic to
--     refresh_price_snapshot's sale-price query), call
--     refresh_price_snapshot() for that date -- it will correctly reflect
--     the real sale, and always takes precedence over synthetic data.
--   * Synthetic path: otherwise, write a plausible, smoothly-varying
--     synthetic median_price_thb directly via a small persistent
--     day-to-day random walk (mean-reverting toward that combo's current
--     average asking price), with sale_count = 0 so synthetic data never
--     counts as a "trade" for trending/hot/most-traded logic.
--
-- The walk is seeded deterministically per species/size (via setseed()) so
-- re-running this migration/seed produces stable, non-diverging results,
-- and it proceeds oldest-to-newest so each day builds on the previous one
-- instead of being independently random (which would look jagged).

CREATE OR REPLACE FUNCTION public.backfill_price_history(p_days int DEFAULT 365)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date := CURRENT_DATE - p_days;
  v_end_date date := CURRENT_DATE - 1;
  combo RECORD;
  species_rec RECORD;
  v_date date;
  v_base_price numeric;
  v_walk numeric;
  v_min_band numeric;
  v_max_band numeric;
  v_seed double precision;
  v_listing_count int;
  v_has_real boolean;
  v_step numeric;
  v_mean_rev numeric;
  v_spread numeric;
  v_median numeric;
  v_mean numeric;
  v_min numeric;
  v_max numeric;
  v_avg_asking numeric;
  v_agg_listing_count int;
  v_existing_sale_count int;
BEGIN
  IF p_days IS NULL OR p_days <= 0 THEN
    RETURN;
  END IF;

  -- ==========================================================================
  -- Pass 1: per (species_id, size_category) combo, walking each date
  -- chronologically (oldest first).
  -- ==========================================================================
  FOR combo IN
    SELECT DISTINCT species_id, size_category
    FROM public.listings
    WHERE status = 'active'
      AND species_id IS NOT NULL
    UNION
    SELECT DISTINCT species_id, size_category
    FROM public.price_snapshots
  LOOP
    -- Anchor: current average asking price across this combo's active listings.
    SELECT avg(price_thb), count(*)
    INTO v_base_price, v_listing_count
    FROM public.listings
    WHERE species_id = combo.species_id
      AND status = 'active'
      AND (combo.size_category IS NULL OR size_category = combo.size_category);

    IF v_base_price IS NULL THEN
      -- No active listings for this combo -- fall back to the most recent
      -- existing snapshot's asking price as an anchor, if any.
      SELECT avg_asking_price
      INTO v_base_price
      FROM public.price_snapshots
      WHERE species_id = combo.species_id
        AND size_category IS NOT DISTINCT FROM combo.size_category
      ORDER BY snapshot_date DESC
      LIMIT 1;
      v_listing_count := 0;
    END IF;

    -- Nothing to anchor a synthetic walk to -- skip this combo entirely.
    IF v_base_price IS NULL OR v_base_price <= 0 THEN
      CONTINUE;
    END IF;

    -- Deterministic per-combo seed in [-1, 1] for setseed(). hashtext()
    -- returns a signed 32-bit int (range -2147483648..2147483647); dividing
    -- by 2^31 keeps the result strictly within [-1, 1] (min case is exactly
    -- -1.0, max case is just under 1.0). GREATEST/LEAST is defense in depth
    -- against any platform-specific edge case.
    v_seed := hashtext(combo.species_id || coalesce(combo.size_category, ''))::double precision
              / 2147483648.0;
    v_seed := GREATEST(-1.0, LEAST(1.0, v_seed));
    PERFORM setseed(v_seed);

    v_walk := v_base_price;
    v_min_band := v_base_price * 0.5;
    v_max_band := v_base_price * 1.8;

    FOR v_date IN
      SELECT generate_series(v_start_date, v_end_date, interval '1 day')::date
    LOOP
      SELECT EXISTS (
        SELECT 1
        FROM public.transactions
        WHERE status = 'completed'
          AND (
            listing_id IN (
              SELECT id FROM public.listings
              WHERE species_id = combo.species_id
                AND (combo.size_category IS NULL OR size_category = combo.size_category)
            )
            OR species_label = combo.species_id
          )
          AND (completed_at::date = v_date OR created_at::date = v_date)
      ) INTO v_has_real;

      IF v_has_real THEN
        -- Real data path always wins: let refresh_price_snapshot compute
        -- and upsert the row from the actual sale, then carry its median
        -- forward as the new walk anchor.
        --
        -- refresh_price_snapshot() itself does INSERT ... ON CONFLICT
        -- (species_id, size_category, snapshot_date), which -- like our
        -- own upserts above -- never matches an existing row when
        -- size_category IS NULL (Postgres treats NULL <> NULL for unique
        -- constraints; verified live). Deleting any existing row first
        -- guarantees its INSERT always lands as a fresh single row instead
        -- of silently duplicating on re-runs, without modifying
        -- refresh_price_snapshot() itself.
        DELETE FROM public.price_snapshots
        WHERE species_id = combo.species_id
          AND size_category IS NOT DISTINCT FROM combo.size_category
          AND snapshot_date = v_date;

        PERFORM public.refresh_price_snapshot(combo.species_id, combo.size_category, v_date);

        SELECT median_price_thb
        INTO v_walk
        FROM public.price_snapshots
        WHERE species_id = combo.species_id
          AND size_category IS NOT DISTINCT FROM combo.size_category
          AND snapshot_date = v_date;

        IF v_walk IS NULL THEN
          v_walk := v_base_price;
        END IF;
      ELSE
        -- Synthetic path: advance the random walk by a small daily step
        -- (~±2%) with mean reversion toward the base price, then clamp to
        -- a sane band so a long walk can't drift to an implausible value.
        v_step := (random() - 0.5) * 0.04;
        v_mean_rev := (v_base_price - v_walk) * 0.05;
        v_walk := v_walk * (1 + v_step) + v_mean_rev;
        v_walk := GREATEST(v_min_band, LEAST(v_max_band, v_walk));

        v_spread := v_walk * (0.05 + random() * 0.03);

        -- NOTE: we deliberately do NOT use INSERT ... ON CONFLICT here.
        -- Postgres unique constraints/indexes treat NULL as distinct from
        -- NULL, so ON CONFLICT (species_id, size_category, snapshot_date)
        -- never matches an existing row when size_category IS NULL --
        -- every "upsert" would silently insert a new duplicate row instead
        -- of updating (verified against a live Postgres 16 instance while
        -- writing this migration). Doing an explicit existence check with
        -- IS NOT DISTINCT FROM sidesteps that entirely and works
        -- identically for NULL and non-NULL size_category.
        SELECT sale_count
        INTO v_existing_sale_count
        FROM public.price_snapshots
        WHERE species_id = combo.species_id
          AND size_category IS NOT DISTINCT FROM combo.size_category
          AND snapshot_date = v_date;

        IF v_existing_sale_count IS NULL THEN
          -- No existing row for this species/size/date -- insert fresh.
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
            combo.species_id,
            combo.size_category,
            v_date,
            round(v_walk),
            round(v_walk),
            round(v_walk - v_spread),
            round(v_walk + v_spread),
            0,
            v_listing_count,
            round(v_walk),
            now()
          );
        ELSIF v_existing_sale_count = 0 THEN
          -- Existing row is itself synthetic (or empty) -- safe to update.
          UPDATE public.price_snapshots
          SET median_price_thb = round(v_walk),
              mean_price_thb = round(v_walk),
              min_price_thb = round(v_walk - v_spread),
              max_price_thb = round(v_walk + v_spread),
              sale_count = 0,
              listing_count = v_listing_count,
              avg_asking_price = round(v_walk),
              updated_at = now()
          WHERE species_id = combo.species_id
            AND size_category IS NOT DISTINCT FROM combo.size_category
            AND snapshot_date = v_date;
        END IF;
        -- Else: v_existing_sale_count > 0 means a real sale already backs
        -- this date's row -- leave it untouched, real data always wins.
      END IF;
    END LOOP;
  END LOOP;

  -- ==========================================================================
  -- Pass 2: "all sizes" aggregate (size_category IS NULL) per species, per
  -- date. Real dates go through refresh_price_snapshot (matching any size);
  -- synthetic dates are averaged from that date's per-size rows written in
  -- pass 1 above.
  -- ==========================================================================
  FOR species_rec IN
    SELECT DISTINCT species_id
    FROM public.listings
    WHERE status = 'active'
      AND species_id IS NOT NULL
    UNION
    SELECT DISTINCT species_id
    FROM public.price_snapshots
  LOOP
    FOR v_date IN
      SELECT generate_series(v_start_date, v_end_date, interval '1 day')::date
    LOOP
      SELECT EXISTS (
        SELECT 1
        FROM public.transactions
        WHERE status = 'completed'
          AND (
            listing_id IN (
              SELECT id FROM public.listings
              WHERE species_id = species_rec.species_id
            )
            OR species_label = species_rec.species_id
          )
          AND (completed_at::date = v_date OR created_at::date = v_date)
      ) INTO v_has_real;

      IF v_has_real THEN
        -- Same NULL-size_category ON CONFLICT footgun inside
        -- refresh_price_snapshot() as above -- delete first so its insert
        -- lands clean instead of duplicating on re-runs.
        DELETE FROM public.price_snapshots
        WHERE species_id = species_rec.species_id
          AND size_category IS NULL
          AND snapshot_date = v_date;

        PERFORM public.refresh_price_snapshot(species_rec.species_id, NULL, v_date);
      ELSE
        SELECT
          avg(median_price_thb),
          avg(mean_price_thb),
          min(min_price_thb),
          max(max_price_thb),
          avg(avg_asking_price),
          sum(listing_count)
        INTO v_median, v_mean, v_min, v_max, v_avg_asking, v_agg_listing_count
        FROM public.price_snapshots
        WHERE species_id = species_rec.species_id
          AND size_category IS NOT NULL
          AND snapshot_date = v_date;

        IF v_median IS NOT NULL THEN
          -- Same NULL-size_category ON CONFLICT footgun as pass 1 above --
          -- use an explicit existence check instead.
          SELECT sale_count
          INTO v_existing_sale_count
          FROM public.price_snapshots
          WHERE species_id = species_rec.species_id
            AND size_category IS NULL
            AND snapshot_date = v_date;

          IF v_existing_sale_count IS NULL THEN
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
              species_rec.species_id,
              NULL,
              v_date,
              round(v_median),
              round(v_mean),
              round(v_min),
              round(v_max),
              0,
              coalesce(v_agg_listing_count, 0),
              round(v_avg_asking),
              now()
            );
          ELSIF v_existing_sale_count = 0 THEN
            UPDATE public.price_snapshots
            SET median_price_thb = round(v_median),
                mean_price_thb = round(v_mean),
                min_price_thb = round(v_min),
                max_price_thb = round(v_max),
                sale_count = 0,
                listing_count = coalesce(v_agg_listing_count, 0),
                avg_asking_price = round(v_avg_asking),
                updated_at = now()
            WHERE species_id = species_rec.species_id
              AND size_category IS NULL
              AND snapshot_date = v_date;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Grant execute so it can be called again later on demand (e.g. from
-- scripts/seed-database.cjs, which runs with the service_role key).
GRANT EXECUTE ON FUNCTION public.backfill_price_history(int) TO service_role;

-- Run the backfill now, for the last year, as part of applying this migration.
SELECT public.backfill_price_history(365);
