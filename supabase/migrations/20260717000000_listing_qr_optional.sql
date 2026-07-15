-- Make QR provenance optional per listing.
-- Sellers can choose to generate a permanent QR tag or list without one.

-- 1. Add opt-out flag to listings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'has_qr_provenance'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN has_qr_provenance boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Existing listings were created with a plant, so keep them as QR-enabled.
UPDATE public.listings SET has_qr_provenance = true WHERE has_qr_provenance IS NULL;

-- 2. Update the plant-creation trigger to skip when QR is disabled.
CREATE OR REPLACE FUNCTION public.create_plant_for_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plant_id uuid;
BEGIN
  -- If QR provenance is disabled, ensure no plant is linked.
  IF NEW.has_qr_provenance = false THEN
    NEW.plant_id := NULL;
    RETURN NEW;
  END IF;

  -- If the listing already references a plant (e.g. relist), refresh metadata.
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

  NEW.plant_id := v_plant_id;
  RETURN NEW;
END;
$$;

-- 3. Partial index for non-QR listings.
CREATE INDEX IF NOT EXISTS idx_listings_no_qr ON public.listings(id) WHERE plant_id IS NULL;
