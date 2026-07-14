-- Watchlist table + RLS. Table may already exist from seeding; statements are idempotent.

CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watch_type text NOT NULL CHECK (watch_type IN ('species', 'listing')),
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_target
  ON public.watchlist (user_id, watch_type, target_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user
  ON public.watchlist (user_id, created_at DESC);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Watchlist select own" ON public.watchlist;
CREATE POLICY "Watchlist select own"
  ON public.watchlist FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Watchlist insert own" ON public.watchlist;
CREATE POLICY "Watchlist insert own"
  ON public.watchlist FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Watchlist delete own" ON public.watchlist;
CREATE POLICY "Watchlist delete own"
  ON public.watchlist FOR DELETE
  USING (user_id = auth.uid());
