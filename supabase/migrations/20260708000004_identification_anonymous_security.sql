-- Phase 3 security hardening: remove arbitrary anonymous write access to
-- plant identification requests and their dependent rows. Anonymous requests
-- can still be created and read, but only authenticated owners may update them
-- or insert dependent results/media. A future enhancement can add signed
-- session tokens for fully-anonymous multi-step flows.

-- Remove any existing UPDATE policies on identification requests before adding the strict one.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plant_identification_requests'
      AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.plant_identification_requests', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Identification requests are updatable by owner only"
  ON public.plant_identification_requests FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Identification media is insertable by request owner" ON public.identification_uploaded_media;
CREATE POLICY "Identification media is insertable by request owner"
  ON public.identification_uploaded_media FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM public.plant_identification_requests WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Identification results are insertable by request owner or public anonymous" ON public.identification_results;
CREATE POLICY "Identification results are insertable by request owner"
  ON public.identification_results FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM public.plant_identification_requests WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Identification provider results are insertable by request owner or public anonymous" ON public.identification_provider_results;
CREATE POLICY "Identification provider results are insertable by request owner"
  ON public.identification_provider_results FOR INSERT
  WITH CHECK (
    result_id IN (
      SELECT id FROM public.identification_results
      WHERE request_id IN (
        SELECT id FROM public.plant_identification_requests WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Market estimates are insertable by request owner or public anonymous" ON public.market_estimates;
CREATE POLICY "Market estimates are insertable by request owner"
  ON public.market_estimates FOR INSERT
  WITH CHECK (
    result_id IN (
      SELECT id FROM public.identification_results
      WHERE request_id IN (
        SELECT id FROM public.plant_identification_requests WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Processing history is insertable by request owner or public anonymous" ON public.processing_history;
CREATE POLICY "Processing history is insertable by request owner"
  ON public.processing_history FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM public.plant_identification_requests WHERE user_id = auth.uid()
    )
  );
