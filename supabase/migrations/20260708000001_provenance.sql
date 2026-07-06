-- Provenance v2: persistent plant identity, append-only transfers, and scan history.

CREATE TABLE IF NOT EXISTS public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id text,
  current_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_plant_id uuid REFERENCES public.plants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deceased', 'lost')),
  qr_signature text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.plants IS 'A persistent physical plant identity. One plant can be listed multiple times via listings.plant_id.';

CREATE TABLE IF NOT EXISTS public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  sale_price_thb numeric,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.transfers IS 'Append-only ownership transfer ledger. Never updated or deleted by normal users.';

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  scanner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scan_source text NOT NULL DEFAULT 'url' CHECK (scan_source IN ('camera', 'manual', 'url')),
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.qr_scans IS 'Immutable log of QR code scans for duplicate/fraud detection.';

-- Add plant_id to listings if not present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'plant_id'
  ) THEN
    ALTER TABLE public.listings ADD COLUMN plant_id uuid REFERENCES public.plants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plants_owner ON public.plants(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_plants_signature ON public.plants(qr_signature);
CREATE INDEX IF NOT EXISTS idx_transfers_plant ON public.transfers(plant_id, transferred_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_plant ON public.qr_scans(plant_id, created_at DESC);

-- RLS: public read, service-role write.
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plants are publicly readable"
  ON public.plants FOR SELECT USING (true);
CREATE POLICY "Plants are service-write only"
  ON public.plants FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "Transfers are publicly readable"
  ON public.transfers FOR SELECT USING (true);
CREATE POLICY "Transfers are service-write only"
  ON public.transfers FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "QR scans are owner-or-scanner readable"
  ON public.qr_scans FOR SELECT
  USING (
    scanner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.plants p
      WHERE p.id = qr_scans.plant_id
        AND p.current_owner_id = auth.uid()
    )
  );
CREATE POLICY "QR scans are insertable by authenticated scanners"
  ON public.qr_scans FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Function: create a plant row when a listing is inserted without one.
CREATE OR REPLACE FUNCTION public.create_plant_for_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Use a BEFORE INSERT trigger so we can mutate NEW.plant_id.
DROP TRIGGER IF EXISTS listings_create_plant_trigger ON public.listings;
CREATE TRIGGER listings_create_plant_trigger
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_plant_for_listing();

-- Function: record a transfer when a transaction completes.
CREATE OR REPLACE FUNCTION public.record_transfer_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
  IF v_listing.plant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Append the transfer.
  INSERT INTO public.transfers (
    plant_id,
    from_user_id,
    to_user_id,
    transaction_id,
    sale_price_thb,
    transferred_at
  ) VALUES (
    v_listing.plant_id,
    NEW.seller_id,
    NEW.buyer_id,
    NEW.id,
    NEW.sale_price_thb,
    NEW.completed_at
  );

  -- Update current owner.
  UPDATE public.plants
  SET current_owner_id = NEW.buyer_id,
      updated_at = now()
  WHERE id = v_listing.plant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_transfer_trigger ON public.transactions;
CREATE TRIGGER transactions_transfer_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_transfer_on_completion();

-- Prevent direct updates/deletes on transfers (append-only).
CREATE OR REPLACE FUNCTION public.prevent_transfer_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Transfers are immutable. Corrections must be made via reversal entries.';
END;
$$;

DROP TRIGGER IF EXISTS transfers_prevent_update ON public.transfers;
CREATE TRIGGER transfers_prevent_update
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_transfer_mutation();

DROP TRIGGER IF EXISTS transfers_prevent_delete ON public.transfers;
CREATE TRIGGER transfers_prevent_delete
  BEFORE DELETE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_transfer_mutation();

-- Helper to verify a QR signature for a plant.
CREATE OR REPLACE FUNCTION public.verify_qr_signature(p_plant_id uuid, p_signature text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT qr_signature INTO v_expected FROM public.plants WHERE id = p_plant_id;
  RETURN v_expected IS NOT NULL AND v_expected = p_signature;
END;
$$;
