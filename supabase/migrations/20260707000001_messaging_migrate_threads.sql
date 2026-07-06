-- Migrate legacy thread-based messages into the new conversations model.
-- Existing thread_id format: thread_<sortedUserId1>_<sortedUserId2>_<listingId|general>

DO $$
DECLARE
  thread_record record;
  new_conversation_id uuid;
  participant_1 uuid;
  participant_2 uuid;
  listing_uuid uuid;
  first_sender uuid;
  last_msg record;
  thread_parts text[];
BEGIN
  -- Iterate over every unique legacy thread_id that matches the expected shape.
  FOR thread_record IN
    SELECT DISTINCT thread_id
    FROM public.messages
    WHERE thread_id LIKE 'thread_%_%_%'
      AND conversation_id IS NULL
  LOOP
    thread_parts := string_to_array(thread_record.thread_id, '_');

    -- Must have exactly 4 parts: thread, user1, user2, listing|general
    IF array_length(thread_parts, 1) <> 4 THEN
      CONTINUE;
    END IF;

    participant_1 := thread_parts[2]::uuid;
    participant_2 := thread_parts[3]::uuid;

    -- Determine listing_id if the thread is listing-specific
    IF thread_parts[4] = 'general' THEN
      listing_uuid := NULL;
    ELSE
      BEGIN
        listing_uuid := thread_parts[4]::uuid;
      EXCEPTION WHEN others THEN
        listing_uuid := NULL;
      END;
    END IF;

    -- Use the first message sender as conversation creator
    SELECT sender_id INTO first_sender
    FROM public.messages
    WHERE thread_id = thread_record.thread_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- Create the conversation
    INSERT INTO public.conversations (
      type,
      title,
      listing_id,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      'direct',
      NULL,
      listing_uuid,
      first_sender,
      (SELECT MIN(created_at) FROM public.messages WHERE thread_id = thread_record.thread_id),
      now()
    )
    RETURNING id INTO new_conversation_id;

    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id, role, joined_at)
    VALUES
      (new_conversation_id, participant_1, 'owner', (SELECT MIN(created_at) FROM public.messages WHERE thread_id = thread_record.thread_id)),
      (new_conversation_id, participant_2, 'owner', (SELECT MIN(created_at) FROM public.messages WHERE thread_id = thread_record.thread_id))
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- Back-fill conversation_id on messages
    UPDATE public.messages
    SET conversation_id = new_conversation_id
    WHERE thread_id = thread_record.thread_id
      AND conversation_id IS NULL;

    -- Set last message on conversation
    SELECT id, created_at INTO last_msg
    FROM public.messages
    WHERE conversation_id = new_conversation_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF last_msg IS NOT NULL THEN
      UPDATE public.conversations
      SET last_message_id = last_msg.id,
          last_message_at = last_msg.created_at
      WHERE id = new_conversation_id;
    END IF;

  END LOOP;
END $$;

-- Migrate legacy read_at to message_reads for the latest message per recipient per conversation.
-- This gives each conversation a starting read receipt baseline.
-- Only run if the legacy read_at column exists (it may not on fresh projects).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    INSERT INTO public.message_reads (message_id, conversation_id, user_id, read_at)
    SELECT DISTINCT ON (m.conversation_id, m.recipient_id)
      m.id,
      m.conversation_id,
      m.recipient_id,
      COALESCE(m.read_at, now())
    FROM public.messages m
    WHERE m.read_at IS NOT NULL
      AND m.conversation_id IS NOT NULL
      AND m.recipient_id IS NOT NULL
    ORDER BY m.conversation_id, m.recipient_id, m.created_at DESC
    ON CONFLICT (message_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Update participant last_read_message_id / last_read_at from the migrated reads
UPDATE public.conversation_participants cp
SET last_read_message_id = mr.message_id,
    last_read_at = mr.read_at
FROM public.message_reads mr
WHERE cp.user_id = mr.user_id
  AND cp.conversation_id = mr.conversation_id;

-- Ensure conversation_id is NOT NULL going forward (only after migration)
ALTER TABLE public.messages
  ALTER COLUMN conversation_id SET NOT NULL;

-- Drop the legacy thread_id column after migration (optional — keep for rollback safety)
-- ALTER TABLE public.messages DROP COLUMN thread_id;
