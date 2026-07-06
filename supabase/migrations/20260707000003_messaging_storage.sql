-- Storage bucket and policies for message attachments

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  26214400, -- 25 MB
  ARRAY[
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/zip',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated users can upload to their own conversation-scoped path
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Participants can read attachments in their conversations.
-- The path is expected to be: {sender_user_id}/{conversation_id}/{filename}
DROP POLICY IF EXISTS "Participants can read message attachments" ON storage.objects;
CREATE POLICY "Participants can read message attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id = (storage.foldername(name))[2]::uuid
        AND cp.left_at IS NULL
    )
  );

-- Users can delete their own uploaded attachments
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;
CREATE POLICY "Users can delete own message attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
