CREATE TABLE IF NOT EXISTS public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address_line text,
  province text,
  lat double precision,
  lng double precision,
  is_default boolean DEFAULT false,
  verified_at timestamptz,
  verification_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_locations_select_own ON public.user_locations;
CREATE POLICY user_locations_select_own
  ON public.user_locations
  FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS user_locations_insert_own ON public.user_locations;
CREATE POLICY user_locations_insert_own
  ON public.user_locations
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS user_locations_update_own ON public.user_locations;
CREATE POLICY user_locations_update_own
  ON public.user_locations
  FOR UPDATE
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS user_locations_delete_own ON public.user_locations;
CREATE POLICY user_locations_delete_own
  ON public.user_locations
  FOR DELETE
  USING (profile_id = auth.uid());
