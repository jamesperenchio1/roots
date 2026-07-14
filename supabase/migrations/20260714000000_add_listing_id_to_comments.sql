-- Add listing-level comments support to the existing community comments schema.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.comments.listing_id IS 'Optional listing this comment is attached to. When null, the comment is species-level.';

-- Index for fast listing comment lookups.
CREATE INDEX IF NOT EXISTS idx_comments_listing_status_created
  ON public.comments (listing_id, status, created_at DESC);

-- Update the species index to keep species-level and listing-level comments cleanly separated.
DROP INDEX IF EXISTS idx_comments_species_status_created;
CREATE INDEX IF NOT EXISTS idx_comments_species_status_created
  ON public.comments (species_id, status, created_at DESC)
  WHERE listing_id IS NULL;
