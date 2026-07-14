-- Storage bucket for comment images.
-- Created on demand by the app; this migration ensures it exists with correct policy.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comment-images',
  'comment-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload their own comment images.
CREATE POLICY "Users can upload own comment images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'comment-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for comment images.
CREATE POLICY "Comment images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comment-images');

-- Users can delete their own comment images; admins can delete any.
CREATE POLICY "Users can delete own comment images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'comment-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_app_admin(auth.uid())
    )
  );
