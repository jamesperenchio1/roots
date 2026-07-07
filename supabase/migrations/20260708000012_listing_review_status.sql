ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS review_status text,
  ADD COLUMN IF NOT EXISTS qr_verification_photo_url text,
  ADD COLUMN IF NOT EXISTS qr_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_verified_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS review_notes text;

-- Widen the status check constraint to include pending_review and rejected.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft','pending_review','active','sold','withdrawn','rejected'));

-- Existing listings that were published straight to active can stay active;
-- any row with a NULL status will be treated as active by the app mapper.
UPDATE public.listings SET status = 'active' WHERE status IS NULL;
