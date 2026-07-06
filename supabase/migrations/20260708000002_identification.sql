-- Plant identification schema: requests, media, results, provider outputs, market estimates, and audit history.

CREATE TABLE IF NOT EXISTS public.plant_identification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'needs_evidence', 'completed', 'failed')),
  requested_evidence_steps text[] NOT NULL DEFAULT '{}',
  current_step int NOT NULL DEFAULT 0,
  country text,
  growing_conditions text,
  notes text,
  confidence_threshold numeric NOT NULL DEFAULT 0.75,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

COMMENT ON TABLE public.plant_identification_requests IS 'A user-initiated plant identification session. Remains open until confidence is acceptable.';

CREATE TABLE IF NOT EXISTS public.identification_uploaded_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.plant_identification_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'document', 'archive')),
  thumbnail_path text,
  preview_path text,
  evidence_type text,
  metadata jsonb DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.identification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.plant_identification_requests(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_version text,
  detected_species_id text,
  scientific_name text,
  common_names text[] DEFAULT '{}',
  confidence numeric NOT NULL,
  reasoning text,
  detected_characteristics text[] DEFAULT '{}',
  native_region text,
  growth_habit text,
  mature_size text,
  difficulty text,
  care_summary text,
  variegation text,
  known_aliases text[] DEFAULT '{}',
  potential_rarity text,
  processing_time_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.identification_provider_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES public.identification_results(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_version text,
  confidence numeric NOT NULL,
  scientific_name text,
  common_names text[] DEFAULT '{}',
  detected_characteristics text[] DEFAULT '{}',
  reasoning text,
  raw_response jsonb DEFAULT '{}',
  processing_time_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.market_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES public.identification_results(id) ON DELETE CASCADE,
  species_id text,
  avg_asking_price numeric,
  median_price numeric,
  lowest_active numeric,
  highest_active numeric,
  recent_sales_count int DEFAULT 0,
  trend_percent numeric,
  suggested_range_low numeric,
  suggested_range_high numeric,
  confidence text,
  data_sufficient boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.plant_identification_requests(id) ON DELETE CASCADE,
  stage text NOT NULL,
  provider text,
  input_summary text,
  output_summary text,
  confidence numeric,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ident_requests_user ON public.plant_identification_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ident_media_request ON public.identification_uploaded_media(request_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ident_results_request ON public.identification_results(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_estimates_result ON public.market_estimates(result_id);

-- RLS
ALTER TABLE public.plant_identification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identification_uploaded_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identification_provider_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Identification requests are owner-or-public"
  ON public.plant_identification_requests FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Identification requests are insertable by anyone"
  ON public.plant_identification_requests FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Identification requests are updatable by owner"
  ON public.plant_identification_requests FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Identification media is readable by request owner or public anonymous"
  ON public.identification_uploaded_media FOR SELECT
  USING (request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Identification media is insertable by request owner"
  ON public.identification_uploaded_media FOR INSERT
  WITH CHECK (request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "Identification results are readable by request owner or public anonymous"
  ON public.identification_results FOR SELECT
  USING (request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "Provider results are readable by request owner or public anonymous"
  ON public.identification_provider_results FOR SELECT
  USING (result_id IN (SELECT id FROM public.identification_results WHERE request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid())));

CREATE POLICY "Market estimates are readable by request owner or public anonymous"
  ON public.market_estimates FOR SELECT
  USING (result_id IN (SELECT id FROM public.identification_results WHERE request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid())));

CREATE POLICY "Processing history is readable by request owner or public anonymous"
  ON public.processing_history FOR SELECT
  USING (request_id IN (SELECT id FROM public.plant_identification_requests WHERE user_id IS NULL OR user_id = auth.uid()));
