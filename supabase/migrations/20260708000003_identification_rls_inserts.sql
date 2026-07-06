-- Allow anonymous and authenticated users to complete the free plant identification flow.

-- Anonymous requests can be updated by anyone because they have no owner.
CREATE POLICY "Identification requests are updatable by owner or public anonymous"
  ON public.plant_identification_requests FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid());

-- Insert policies for dependent identification tables.
CREATE POLICY "Identification results are insertable by request owner or public anonymous"
  ON public.identification_results FOR INSERT
  WITH CHECK (request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "Identification provider results are insertable by request owner or public anonymous"
  ON public.identification_provider_results FOR INSERT
  WITH CHECK (
    result_id IN (
      SELECT id FROM public.identification_results
      WHERE request_id IN (
        SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Market estimates are insertable by request owner or public anonymous"
  ON public.market_estimates FOR INSERT
  WITH CHECK (
    result_id IN (
      SELECT id FROM public.identification_results
      WHERE request_id IN (
        SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Processing history is insertable by request owner or public anonymous"
  ON public.processing_history FOR INSERT
  WITH CHECK (request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()));
