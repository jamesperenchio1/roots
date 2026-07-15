-- First-time user onboarding state.
-- Stored as JSONB so future tutorial steps can be added without schema changes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_status jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.onboarding_status IS 'Tracks first-time tutorial progress and completion.';
