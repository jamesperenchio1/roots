-- One-time migration from the legacy product-review table to seller_reviews.
-- Preserves existing buyer feedback by attributing it to the seller of the transaction.
-- Runs safely multiple times because of the UNIQUE(transaction_id, reviewer_id) constraint.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reviews'
  ) THEN
    INSERT INTO public.seller_reviews (
      transaction_id,
      reviewer_id,
      seller_id,
      rating,
      comment,
      image_urls,
      verified_purchase,
      status,
      created_at,
      updated_at
    )
    SELECT
      r.transaction_id,
      r.reviewer_id,
      r.seller_id,
      r.rating,
      r.comment,
      COALESCE(r.tags, '{}'),
      true,
      'visible',
      r.created_at,
      r.created_at
    FROM public.reviews r
    WHERE r.transaction_id IS NOT NULL
      AND r.reviewer_id IS NOT NULL
      AND r.seller_id IS NOT NULL
    ON CONFLICT (transaction_id, reviewer_id) DO NOTHING;
  END IF;
END $$;
