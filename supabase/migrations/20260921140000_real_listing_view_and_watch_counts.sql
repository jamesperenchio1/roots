-- Make listing "views" and "watching" counters real.
--
-- Previously listings.view_count / watch_count were random values written once
-- at seed time and never updated: recordView() only wrote localStorage, and
-- toggleWatch() wrote the watchlist table without touching listings.
--
-- This adds:
--   1. a trigger keeping listings.watch_count in sync with watchlist rows
--   2. a backfill so existing counts reflect reality
--   3. increment_listing_view(), a SECURITY DEFINER RPC the client calls on
--      listing view (it must be SECURITY DEFINER because RLS prevents a
--      regular visitor from updating someone else's listing row)

-- 1. Watch-count trigger ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_listing_watch_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.watch_type <> 'listing' THEN RETURN NEW; END IF;
    BEGIN
      v_listing_id := NULLIF(NEW.target_id, '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NEW;
    END;
    IF v_listing_id IS NOT NULL THEN
      UPDATE public.listings SET watch_count = watch_count + 1 WHERE id = v_listing_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.watch_type <> 'listing' THEN RETURN OLD; END IF;
    BEGIN
      v_listing_id := NULLIF(OLD.target_id, '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN OLD;
    END;
    IF v_listing_id IS NOT NULL THEN
      UPDATE public.listings SET watch_count = GREATEST(watch_count - 1, 0) WHERE id = v_listing_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_listing_watch_count ON public.watchlist;
CREATE TRIGGER trg_sync_listing_watch_count
AFTER INSERT OR DELETE ON public.watchlist
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_watch_count();

-- 2. Backfill current watch counts -----------------------------------------
UPDATE public.listings l
SET watch_count = COALESCE((
  SELECT count(*) FROM public.watchlist w
  WHERE w.watch_type = 'listing' AND w.target_id = l.id::text
), 0);

-- 3. View counter RPC ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_listing_view(p_listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings
  SET view_count = view_count + 1
  WHERE id = p_listing_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated;
