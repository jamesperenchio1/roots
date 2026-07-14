-- Community comments: public species-level discussions.

-- ---------- comments ----------
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id text NOT NULL,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) <= 5000),
  content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown')),
  -- engagement counters (maintained by triggers)
  likes_count integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0,
  -- moderation
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'under_review')),
  reported_count integer NOT NULL DEFAULT 0,
  admin_notes text,
  -- edit / delete metadata
  edited_at timestamptz,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comments IS 'Public species-level community comments with threaded replies.';

CREATE INDEX IF NOT EXISTS idx_comments_species_status_created
  ON public.comments (species_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_status_created
  ON public.comments (parent_comment_id, status, created_at DESC)
  WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author_created
  ON public.comments (author_id, created_at DESC);

-- ---------- comment_images ----------
CREATE TABLE IF NOT EXISTS public.comment_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comment_images_comment_id
  ON public.comment_images (comment_id);

-- ---------- comment_reactions ----------
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (length(reaction) <= 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id
  ON public.comment_reactions (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id
  ON public.comment_reactions (user_id);

-- ---------- comment_mentions ----------
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id
  ON public.comment_mentions (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_id
  ON public.comment_mentions (mentioned_user_id);

-- ---------- comment_reports ----------
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved_dismissed', 'resolved_hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status_created
  ON public.comment_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id
  ON public.comment_reports (comment_id);

-- ---------- RLS ----------
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- comments SELECT: visible to public; hidden/under_review visible to author or admin.
CREATE POLICY "Visible comments are publicly readable"
  ON public.comments FOR SELECT
  USING (status = 'visible' OR author_id = auth.uid() OR public.is_app_admin(auth.uid()));

-- comments INSERT: authenticated, non-banned users.
CREATE POLICY "Authenticated users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- comments UPDATE: author (content only, not deleted/hidden) or admin.
CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  USING (author_id = auth.uid() OR public.is_app_admin(auth.uid()))
  WITH CHECK (
    (author_id = auth.uid() AND deleted_at IS NULL)
    OR public.is_app_admin(auth.uid())
  );

-- comments DELETE: soft delete only; author or admin. Hard deletes are blocked by app logic.
CREATE POLICY "Authors can delete own comments"
  ON public.comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_app_admin(auth.uid()));

-- comment_images: visibility follows parent comment.
CREATE POLICY "Comment images inherit comment visibility"
  ON public.comment_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_images.comment_id
        AND (c.status = 'visible' OR c.author_id = auth.uid() OR public.is_app_admin(auth.uid()))
    )
  );

CREATE POLICY "Comment authors can insert images"
  ON public.comment_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_images.comment_id
        AND c.author_id = auth.uid()
    )
  );

CREATE POLICY "Comment authors can delete images"
  ON public.comment_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_images.comment_id
        AND c.author_id = auth.uid()
    )
    OR public.is_app_admin(auth.uid())
  );

-- comment_reactions: public read; own insert/delete.
CREATE POLICY "Comment reactions are publicly readable"
  ON public.comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add own reactions"
  ON public.comment_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions"
  ON public.comment_reactions FOR DELETE
  USING (user_id = auth.uid());

-- comment_mentions: visible to involved users and admins.
CREATE POLICY "Comment mentions are visible to mentioned users and admins"
  ON public.comment_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid() OR public.is_app_admin(auth.uid()));

CREATE POLICY "System can insert comment mentions"
  ON public.comment_mentions FOR INSERT
  WITH CHECK (true);

-- comment_reports: reporter/admin read; authenticated insert own.
CREATE POLICY "Comment reports visible to reporter and admins"
  ON public.comment_reports FOR SELECT
  USING (reported_by = auth.uid() OR public.is_app_admin(auth.uid()));

CREATE POLICY "Authenticated users can report comments"
  ON public.comment_reports FOR INSERT
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Only admins can resolve reports"
  ON public.comment_reports FOR UPDATE
  USING (public.is_app_admin(auth.uid()));
