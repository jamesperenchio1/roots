-- Enable RLS on listings and let authenticated sellers manage their own listings.
-- Admins can manage all listings. Public can read active listings.

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listings select public active or own or admin" ON public.listings;
CREATE POLICY "Listings select public active or own or admin"
  ON public.listings FOR SELECT
  USING (
    status = 'active'
    OR seller_id = auth.uid()
    OR public.is_app_admin()
  );

DROP POLICY IF EXISTS "Listings insert own" ON public.listings;
CREATE POLICY "Listings insert own"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND seller_id = auth.uid()
  );

DROP POLICY IF EXISTS "Listings update own or admin" ON public.listings;
CREATE POLICY "Listings update own or admin"
  ON public.listings FOR UPDATE
  USING (seller_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Listings delete own or admin" ON public.listings;
CREATE POLICY "Listings delete own or admin"
  ON public.listings FOR DELETE
  USING (seller_id = auth.uid() OR public.is_app_admin());

-- The plant-creation trigger must run with owner privileges because public.plants
-- is service-role-only for writes. SECURITY DEFINER lets the trigger insert the
-- linked plant row on behalf of an authenticated seller.
CREATE OR REPLACE FUNCTION public.create_plant_for_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plant_id uuid;
BEGIN
  -- If the listing already references a plant (e.g. relist), just refresh metadata.
  IF NEW.plant_id IS NOT NULL THEN
    UPDATE public.plants
    SET current_owner_id = NEW.seller_id,
        species_id = NEW.species_id,
        updated_at = now()
    WHERE id = NEW.plant_id;
    RETURN NEW;
  END IF;

  -- Create a new plant identity for this physical item.
  INSERT INTO public.plants (species_id, current_owner_id, qr_signature)
  VALUES (NEW.species_id, NEW.seller_id, gen_random_uuid())
  RETURNING id INTO v_plant_id;

  -- Link the listing to the new plant.
  NEW.plant_id := v_plant_id;

  RETURN NEW;
END;
$$;
