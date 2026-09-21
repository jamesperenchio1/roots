-- Align conversations.last_message_id with messages.id.
--
-- messages.id is text, but conversations.last_message_id was uuid and the
-- update_conversation_last_message() trigger cast NEW.id::uuid. The client
-- generates non-UUID message ids (m-<timestamp>-<random>), so every message
-- insert failed with "invalid input syntax for type uuid" — and the client
-- swallowed that error, so messages looked sent but never persisted.
--
-- This is the relevant slice of 20260716000002_production_hardening.sql, which
-- was never recorded as applied on the live project.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversations'
      AND column_name = 'last_message_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.conversations
      ALTER COLUMN last_message_id TYPE text USING last_message_id::text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_id = NEW.id,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
