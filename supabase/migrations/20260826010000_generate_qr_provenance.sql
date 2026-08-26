-- Generate a QR provenance tag for a listing that currently has none.
-- The INSERT trigger create_plant_for_listing only fires on INSERT, so listings
-- created without QR (or updated) need an explicit way to mint a plant identity.

CREATE OR REPLACE FUNCTION public.generate_qr_provenance(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
  v_plant_id uuid;
BEGIN
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_listing.seller_id <> auth.uid() AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_listing.plant_id IS NOT NULL THEN
    RETURN v_listing.plant_id;
  END IF;

  INSERT INTO public.plants (species_id, current_owner_id, qr_signature)
  VALUES (v_listing.species_id, v_listing.seller_id, gen_random_uuid())
  RETURNING id INTO v_plant_id;

  UPDATE public.listings
     SET plant_id = v_plant_id,
         has_qr_provenance = true,
         updated_at = now()
   WHERE id = p_listing_id;

  RETURN v_plant_id;
END;
$$;

-- Grant execute to authenticated users (RLS + auth.uid() checks inside).
GRANT EXECUTE ON FUNCTION public.generate_qr_provenance(uuid) TO authenticated;