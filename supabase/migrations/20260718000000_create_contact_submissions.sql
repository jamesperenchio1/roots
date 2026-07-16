-- Contact form submissions persisted for audit and support workflows.

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contact_submissions IS 'Messages submitted through the public contact form.';

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status_created_at
  ON public.contact_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email
  ON public.contact_submissions (email);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit a contact message.
CREATE POLICY "Allow public contact form submissions"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

-- Only admins can view or manage submissions.
CREATE POLICY "Contact submissions readable by admins only"
  ON public.contact_submissions FOR SELECT
  USING (public.is_app_admin(auth.uid()));

CREATE POLICY "Contact submissions updatable by admins only"
  ON public.contact_submissions FOR UPDATE
  USING (public.is_app_admin(auth.uid()));

-- Auto-update timestamp on edit.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS contact_submissions_set_updated_at ON public.contact_submissions;
CREATE TRIGGER contact_submissions_set_updated_at
  BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
