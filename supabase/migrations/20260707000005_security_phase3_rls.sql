-- Phase 3 security hardening: tighten messaging RLS policies.

-- conversation_participants INSERT: only the conversation creator can add other
-- users; users can always add themselves.
DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation creators can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (
      auth.uid() IN (
        SELECT created_by FROM public.conversations WHERE id = conversation_id
      )
      AND auth.role() = 'authenticated'
    )
    OR public.is_app_admin()
  );

-- message_reactions: caller must be a participant of the message's conversation.
DROP POLICY IF EXISTS "Users can manage own reactions" ON public.message_reactions;
CREATE POLICY "Users can manage own reactions"
  ON public.message_reactions FOR ALL
  USING (
    user_id = auth.uid()
    AND public.is_conversation_participant(
      (SELECT conversation_id FROM public.messages WHERE id = message_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_conversation_participant(
      (SELECT conversation_id FROM public.messages WHERE id = message_id)
    )
  );

-- message_attachments INSERT: caller must be the sender of the parent message.
DROP POLICY IF EXISTS "Senders can insert attachments" ON public.message_attachments;
CREATE POLICY "Senders can insert attachments"
  ON public.message_attachments FOR INSERT
  WITH CHECK (
    public.is_conversation_participant(conversation_id)
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );
