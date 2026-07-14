-- Seller reputation system: reviews tied only to sellers, not to plants or listings.
-- Only verified buyers (completed transactions) can leave a review.

CREATE TABLE IF NOT EXISTS public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- overall experience
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (length(comment) <= 2000),
  would_buy_again boolean,
  -- optional dimension ratings
  packaging_rating integer CHECK (packaging_rating BETWEEN 1 AND 5),
  plant_condition_rating integer CHECK (plant_condition_rating BETWEEN 1 AND 5),
  communication_rating integer CHECK (communication_rating BETWEEN 1 AND 5),
  shipping_speed_rating integer CHECK (shipping_speed_rating BETWEEN 1 AND 5),
  listing_accuracy_rating integer CHECK (listing_accuracy_rating BETWEEN 1 AND 5),
  -- images
  image_urls text[] NOT NULL DEFAULT '{}',
  -- trust / moderation
  verified_purchase boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'under_review')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, reviewer_id)
);

COMMENT ON TABLE public.seller_reviews IS 'Buyer-to-seller reviews based on completed transactions.';

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_status_created
  ON public.seller_reviews (seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_reviewer_seller
  ON public.seller_reviews (reviewer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_transaction
  ON public.seller_reviews (transaction_id);

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- Public read of visible reviews.
CREATE POLICY "Seller reviews are publicly readable"
  ON public.seller_reviews FOR SELECT
  USING (status = 'visible');

-- Authors and admins can read their own hidden/under-review reviews.
CREATE POLICY "Authors can read own seller reviews"
  ON public.seller_reviews FOR SELECT
  USING (reviewer_id = auth.uid() OR public.is_app_admin(auth.uid()));

-- Only the buyer of a completed transaction may insert a review for that transaction.
CREATE POLICY "Verified buyers can insert seller reviews"
  ON public.seller_reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND t.buyer_id = auth.uid()
        AND t.status = 'completed'
    )
  );

-- Authors can update their own review within 30 days; admins can update status/notes.
CREATE POLICY "Authors can update own seller reviews"
  ON public.seller_reviews FOR UPDATE
  USING (reviewer_id = auth.uid() OR public.is_app_admin(auth.uid()))
  WITH CHECK (
    reviewer_id = auth.uid()
    OR public.is_app_admin(auth.uid())
  );

-- Only admins can hard-delete.
CREATE POLICY "Only admins can delete seller reviews"
  ON public.seller_reviews FOR DELETE
  USING (public.is_app_admin(auth.uid()));

-- Keep profiles.rating and profiles.sales_count in sync.
CREATE OR REPLACE FUNCTION public.update_seller_stats_on_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_seller_id uuid;
  v_avg numeric;
  v_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_seller_id := OLD.seller_id;
  ELSE
    v_seller_id := NEW.seller_id;
  END IF;

  SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO v_count, v_avg
    FROM public.seller_reviews
   WHERE seller_id = v_seller_id
     AND status = 'visible';

  UPDATE public.profiles
     SET rating = ROUND(v_avg, 1),
         sales_count = GREATEST(sales_count, v_count)
   WHERE id = v_seller_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS seller_reviews_update_stats_trigger ON public.seller_reviews;
CREATE TRIGGER seller_reviews_update_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seller_stats_on_review_change();

-- Auto-update updated_at.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_reviews_set_updated_at ON public.seller_reviews;
CREATE TRIGGER seller_reviews_set_updated_at
  BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
