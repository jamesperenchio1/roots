-- Idempotent storage bucket setup for listing photos and payment slips.
-- Buckets are created/updated in one place (migrations) rather than relying on
-- client-side bootstrapping.

-- ---------------------------------------------------------------------------
-- listing-photos: public, images only, 10 MB
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-photos', 'listing-photos', true, 10485760, ARRAY['image/*']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read listing photos" ON storage.objects;
CREATE POLICY "Public read listing photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

DROP POLICY IF EXISTS "Authenticated upload own listing photos" ON storage.objects;
CREATE POLICY "Authenticated upload own listing photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner update own listing photos" ON storage.objects;
CREATE POLICY "Owner update own listing photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner delete own listing photos" ON storage.objects;
CREATE POLICY "Owner delete own listing photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- payment-slips: private to transaction parties, images only, 10 MB
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-slips', 'payment-slips', false, 10485760, ARRAY['image/*']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Parties read payment slips" ON storage.objects;
CREATE POLICY "Parties read payment slips"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-slips'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT seller_id::text FROM public.transactions WHERE payment_slip_path = name
        UNION
        SELECT buyer_id::text FROM public.transactions WHERE payment_slip_path = name
      )
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "Buyer upload own payment slips" ON storage.objects;
CREATE POLICY "Buyer upload own payment slips"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-slips'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner update own payment slips" ON storage.objects;
CREATE POLICY "Owner update own payment slips"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'payment-slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner delete own payment slips" ON storage.objects;
CREATE POLICY "Owner delete own payment slips"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-slips'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
