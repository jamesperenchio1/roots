-- Add messaging tables to the Supabase Realtime publication so clients can subscribe to changes.

-- Helper to idempotently add a table to the realtime publication.
CREATE OR REPLACE FUNCTION public.add_table_to_realtime_publication(table_name text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = table_name
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
END;
$$ LANGUAGE plpgsql;

SELECT public.add_table_to_realtime_publication('conversations');
SELECT public.add_table_to_realtime_publication('conversation_participants');
SELECT public.add_table_to_realtime_publication('messages');
SELECT public.add_table_to_realtime_publication('message_attachments');
SELECT public.add_table_to_realtime_publication('message_reactions');
SELECT public.add_table_to_realtime_publication('message_reads');
SELECT public.add_table_to_realtime_publication('message_reports');
SELECT public.add_table_to_realtime_publication('user_presence');

DROP FUNCTION IF EXISTS public.add_table_to_realtime_publication(text);
