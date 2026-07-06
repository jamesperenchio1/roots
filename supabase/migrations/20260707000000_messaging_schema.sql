-- Messaging system v2 schema foundation
-- Creates conversations, participants, reactions, reads, reports, presence, email queue, audit logs,
-- and adds new columns to the existing messages table.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- conversations ----------
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title text,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_id uuid,
  last_message_at timestamptz,
  archived_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.conversations IS 'A messaging conversation (direct or group).';

CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC NULLS LAST);

-- Align messages.id to text before any FK references it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'id' AND data_type = 'uuid') THEN
    ALTER TABLE public.messages ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.messages ALTER COLUMN id TYPE text USING id::text;
  END IF;
END $$;

-- ---------- conversation_participants ----------
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_read_message_id text REFERENCES public.messages(id) ON DELETE SET NULL,
  last_read_at timestamptz,
  is_muted boolean NOT NULL DEFAULT false,
  muted_until timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);

-- ---------- messages (add new columns to existing table) ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id') THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content_type') THEN
    ALTER TABLE public.messages ADD COLUMN content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'system'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'reply_to_message_id') THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_message_id text REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'forwarded_from_message_id') THEN
    ALTER TABLE public.messages ADD COLUMN forwarded_from_message_id text REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'edited_at') THEN
    ALTER TABLE public.messages ADD COLUMN edited_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'edited_by') THEN
    ALTER TABLE public.messages ADD COLUMN edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.messages ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_system_event') THEN
    ALTER TABLE public.messages ADD COLUMN is_system_event boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'system_event_type') THEN
    ALTER TABLE public.messages ADD COLUMN system_event_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'metadata') THEN
    ALTER TABLE public.messages ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_message_id ON public.messages(reply_to_message_id);

-- ---------- message_attachments ----------
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  thumbnail_path text,
  preview_path text,
  width int,
  height int,
  duration_seconds float,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_conversation_id ON public.message_attachments(conversation_id);

-- ---------- message_reactions ----------
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);

-- ---------- message_reads ----------
CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id_user_id ON public.message_reads(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_conversation_id_user_id_read_at ON public.message_reads(conversation_id, user_id, read_at);

-- ---------- message_reports ----------
CREATE TABLE IF NOT EXISTS public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'resolved_dismissed', 'resolved_deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status ON public.message_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON public.message_reports(message_id);

-- ---------- user_presence ----------
CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status, last_seen_at DESC);

-- ---------- email_notification_queue ----------
CREATE TABLE IF NOT EXISTS public.email_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id text REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_name text,
  preview text,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON public.email_notification_queue(scheduled_at)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_queue_recipient_conversation ON public.email_notification_queue(recipient_id, conversation_id);

-- Enforce one pending email per recipient/conversation
DROP INDEX IF EXISTS idx_email_queue_unique_pending;
CREATE UNIQUE INDEX idx_email_queue_unique_pending
  ON public.email_notification_queue (recipient_id, conversation_id)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;

-- ---------- audit_logs ----------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

-- ---------- RLS ----------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Make sure messages RLS is enabled (it likely already is)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a participant?
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: is the caller an admin?
CREATE OR REPLACE FUNCTION public.is_app_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT p.is_admin INTO is_admin FROM public.profiles p WHERE p.id = uid;
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- conversations
DROP POLICY IF EXISTS "Participants can read conversations" ON public.conversations;
CREATE POLICY "Participants can read conversations"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_participant(id) OR public.is_app_admin());

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

DROP POLICY IF EXISTS "Participants can update conversation metadata" ON public.conversations;
CREATE POLICY "Participants can update conversation metadata"
  ON public.conversations FOR UPDATE
  USING (public.is_conversation_participant(id) OR public.is_app_admin());

-- conversation_participants
DROP POLICY IF EXISTS "Users can read own participant rows" ON public.conversation_participants;
CREATE POLICY "Users can read own participant rows"
  ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation creators can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (public.is_conversation_participant(conversation_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "Users can update own participant row" ON public.conversation_participants;
CREATE POLICY "Users can update own participant row"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid() OR public.is_app_admin());

-- messages
DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT
  USING (public.is_conversation_participant(conversation_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (public.is_conversation_participant(conversation_id) AND sender_id = auth.uid());

DROP POLICY IF EXISTS "Senders can soft-update own messages" ON public.messages;
CREATE POLICY "Senders can soft-update own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid() OR public.is_app_admin());

-- message_attachments
DROP POLICY IF EXISTS "Participants can read attachments" ON public.message_attachments;
CREATE POLICY "Participants can read attachments"
  ON public.message_attachments FOR SELECT
  USING (public.is_conversation_participant(conversation_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "Senders can insert attachments" ON public.message_attachments;
CREATE POLICY "Senders can insert attachments"
  ON public.message_attachments FOR INSERT
  WITH CHECK (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Senders can update own attachments" ON public.message_attachments;
CREATE POLICY "Senders can update own attachments"
  ON public.message_attachments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND m.sender_id = auth.uid()) OR public.is_app_admin());

-- message_reactions
DROP POLICY IF EXISTS "Participants can read reactions" ON public.message_reactions;
CREATE POLICY "Participants can read reactions"
  ON public.message_reactions FOR SELECT
  USING (public.is_conversation_participant(
    (SELECT conversation_id FROM public.messages WHERE id = message_id)
  ) OR public.is_app_admin());

DROP POLICY IF EXISTS "Users can manage own reactions" ON public.message_reactions;
CREATE POLICY "Users can manage own reactions"
  ON public.message_reactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- message_reads
DROP POLICY IF EXISTS "Participants can read reads" ON public.message_reads;
CREATE POLICY "Participants can read reads"
  ON public.message_reads FOR SELECT
  USING (public.is_conversation_participant(conversation_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "Users can record own reads" ON public.message_reads;
CREATE POLICY "Users can record own reads"
  ON public.message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Users can update own reads" ON public.message_reads;
CREATE POLICY "Users can update own reads"
  ON public.message_reads FOR UPDATE
  USING (user_id = auth.uid());

-- message_reports
DROP POLICY IF EXISTS "Reporter and admins can read reports" ON public.message_reports;
CREATE POLICY "Reporter and admins can read reports"
  ON public.message_reports FOR SELECT
  USING (reported_by = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Authenticated users can report messages" ON public.message_reports;
CREATE POLICY "Authenticated users can report messages"
  ON public.message_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND reported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update reports" ON public.message_reports;
CREATE POLICY "Admins can update reports"
  ON public.message_reports FOR UPDATE
  USING (public.is_app_admin());

-- user_presence
DROP POLICY IF EXISTS "Presence is public read" ON public.user_presence;
CREATE POLICY "Presence is public read"
  ON public.user_presence FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- email_notification_queue (service role only writes; owner read)
DROP POLICY IF EXISTS "Users can read own email queue rows" ON public.email_notification_queue;
CREATE POLICY "Users can read own email queue rows"
  ON public.email_notification_queue FOR SELECT
  USING (recipient_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Service role can manage email queue" ON public.email_notification_queue;
CREATE POLICY "Service role can manage email queue"
  ON public.email_notification_queue FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- audit_logs (service role only)
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_app_admin());

-- ---------- triggers ----------

-- Auto-update updated_at on conversations
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_presence_updated_at ON public.user_presence;
CREATE TRIGGER user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update conversation last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_id = NEW.id,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_update_conversation_last_message ON public.messages;
CREATE TRIGGER messages_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Prevent non-admins from hard-deleting messages (enforce soft delete via client)
CREATE OR REPLACE FUNCTION public.prevent_message_hard_delete()
RETURNS trigger AS $$
BEGIN
  IF public.is_app_admin() THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Messages can only be soft-deleted. Use update deleted_at instead.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS messages_prevent_hard_delete ON public.messages;
CREATE TRIGGER messages_prevent_hard_delete
  BEFORE DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_message_hard_delete();

-- Simple audit trigger for messages (edit/delete)
CREATE OR REPLACE FUNCTION public.audit_message_changes()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'message_updated', 'messages', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_audit ON public.messages;
CREATE TRIGGER messages_audit
  AFTER UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.audit_message_changes();
