-- Security lockdown, part 1a.
-- Closes privilege-escalation and cross-user write holes found in the audit.
-- Order/transaction hardening (RPC-based) ships separately in 1b.

-- ---------------------------------------------------------------------------
-- 0. Missing column that mark_listing_sold_for_order / generate_qr_provenance write
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 1. profiles: users may only write their own harmless columns.
--    is_admin / is_banned / strike_count / rating / sales_count / payout_* are
--    writable only by service_role or SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (display_name, location, promptpay_id, avatar_url,
              language_preference, onboarding_status, updated_at)
  ON public.profiles TO authenticated;

GRANT INSERT (id, display_name, location, promptpay_id, avatar_url,
              language_preference, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Admin moderation goes through a checked RPC.
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_is_banned boolean DEFAULT NULL,
  p_strike_count integer DEFAULT NULL,
  p_is_admin boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'admin_update_user: permission denied' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() AND p_is_admin IS NOT NULL AND p_is_admin = false THEN
    RAISE EXCEPTION 'admin_update_user: cannot remove your own admin flag';
  END IF;
  UPDATE public.profiles SET
    is_banned    = COALESCE(p_is_banned, is_banned),
    strike_count = COALESCE(p_strike_count, strike_count),
    is_admin     = COALESCE(p_is_admin, is_admin),
    updated_at   = now()
  WHERE id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, boolean, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, boolean, integer, boolean) TO authenticated;

-- Seller rating trigger must run as definer now that users cannot write rating.
ALTER FUNCTION public.update_seller_stats_on_review_change() SECURITY DEFINER;
ALTER FUNCTION public.update_seller_stats_on_review_change() SET search_path = public;

-- ---------------------------------------------------------------------------
-- 2. listings: moderation and counters are not seller-controlled.
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user is the API role for direct client
-- writes and the function owner when called from our SECURITY DEFINER internals.
CREATE OR REPLACE FUNCTION public.guard_listing_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_review' END;
    NEW.review_status := NULL;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.review_reason := NULL;
    NEW.review_notes := NULL;
    NEW.qr_verified_at := NULL;
    NEW.qr_verified_by := NULL;
    NEW.boosted_until := NULL;
    NEW.view_count := 0;
    NEW.watch_count := 0;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.review_status IS DISTINCT FROM OLD.review_status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.review_reason IS DISTINCT FROM OLD.review_reason
     OR NEW.review_notes IS DISTINCT FROM OLD.review_notes
     OR NEW.qr_verified_at IS DISTINCT FROM OLD.qr_verified_at
     OR NEW.qr_verified_by IS DISTINCT FROM OLD.qr_verified_by
     OR NEW.view_count IS DISTINCT FROM OLD.view_count
     OR NEW.watch_count IS DISTINCT FROM OLD.watch_count
     OR NEW.has_qr_provenance IS DISTINCT FROM OLD.has_qr_provenance
  THEN
    RAISE EXCEPTION 'Protected listing columns can only be changed by admins';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_listing_protected_columns ON public.listings;
CREATE TRIGGER guard_listing_protected_columns
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_protected_columns();

-- Sellers cannot self-approve: pending_review -> active/rejected is admin-only.
CREATE OR REPLACE FUNCTION public.guard_listing_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN RETURN NEW; END IF;
  IF (OLD.status = 'draft' AND NEW.status = 'pending_review')
     OR (OLD.status = 'pending_review' AND NEW.status IN ('draft', 'withdrawn'))
     OR (OLD.status = 'rejected' AND NEW.status IN ('pending_review', 'withdrawn'))
     OR (OLD.status = 'active' AND NEW.status IN ('sold', 'withdrawn'))
     OR (OLD.status = 'withdrawn' AND NEW.status = 'active')
     OR (OLD.status = 'sold' AND NEW.status = 'active')
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Invalid listing status transition: % -> %', OLD.status, NEW.status;
END;
$$;

-- Drop the duplicate permissive UPDATE policy (the admin-or-owner one remains).
DROP POLICY IF EXISTS "listings_update_own" ON public.listings;

-- ---------------------------------------------------------------------------
-- 3. Messaging: no self-join, no sender-only insert bypass.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Conversation creators can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation creators can add participants"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = (SELECT auth.uid())
    )
    OR public.is_app_admin()
  );

DROP POLICY IF EXISTS "msg_insert_sender" ON public.messages;
DROP POLICY IF EXISTS "Senders can soft-update own messages" ON public.messages;
CREATE POLICY "Senders can soft-update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR public.is_app_admin())
  WITH CHECK (
    (sender_id = (SELECT auth.uid()) AND public.is_conversation_participant(conversation_id))
    OR public.is_app_admin()
  );

-- ---------------------------------------------------------------------------
-- 4. comments / seller_reviews: authorship + protected columns
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND NOT COALESCE((SELECT p.is_banned FROM public.profiles p WHERE p.id = (SELECT auth.uid())), false)
  );

CREATE OR REPLACE FUNCTION public.guard_comment_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'visible';
    NEW.admin_notes := NULL;
    NEW.likes_count := 0;
    NEW.reported_count := 0;
    NEW.deleted_at := NULL;
    NEW.deleted_by := NULL;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.likes_count IS DISTINCT FROM OLD.likes_count
     OR NEW.replies_count IS DISTINCT FROM OLD.replies_count
     OR NEW.reported_count IS DISTINCT FROM OLD.reported_count
     OR NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'Protected comment columns can only be changed by admins';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_comment_protected_columns ON public.comments;
CREATE TRIGGER guard_comment_protected_columns
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_comment_protected_columns();

DROP POLICY IF EXISTS "Verified buyers can insert seller reviews" ON public.seller_reviews;
CREATE POLICY "Verified buyers can insert seller reviews"
  ON public.seller_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = seller_reviews.transaction_id
        AND t.buyer_id = (SELECT auth.uid())
        AND t.seller_id = seller_reviews.seller_id
        AND t.status = 'completed'
    )
  );

CREATE OR REPLACE FUNCTION public.guard_seller_review_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_app_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'visible';
    NEW.admin_notes := NULL;
    NEW.verified_purchase := true;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.verified_purchase IS DISTINCT FROM OLD.verified_purchase
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.transaction_id IS DISTINCT FROM OLD.transaction_id
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    RAISE EXCEPTION 'Protected review columns can only be changed by admins';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_seller_review_protected_columns ON public.seller_reviews;
CREATE TRIGGER guard_seller_review_protected_columns
  BEFORE INSERT OR UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_seller_review_protected_columns();

-- ---------------------------------------------------------------------------
-- 5. Audit trail is system-written only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert transaction events" ON public.transaction_events;

-- ---------------------------------------------------------------------------
-- 6. Storage: private buckets are readable only by the people they belong to.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parties read receipt photos" ON storage.objects;
CREATE POLICY "Parties read receipt photos" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipt-photos' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.receipt_photo_path = objects.name
          AND (t.buyer_id = (SELECT auth.uid()) OR t.seller_id = (SELECT auth.uid()))
      )
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "Parties read dispute evidence" ON storage.objects;
CREATE POLICY "Parties read dispute evidence" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR EXISTS (
        SELECT 1
        FROM public.disputes d
        JOIN public.transactions t ON t.id = d.transaction_id
        WHERE (t.buyer_id = (SELECT auth.uid()) OR t.seller_id = (SELECT auth.uid()))
          AND (storage.foldername(objects.name))[1] IN (t.buyer_id::text, t.seller_id::text)
      )
      OR public.is_app_admin()
    )
  );

DROP POLICY IF EXISTS "payment_slips_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "payment_slips_insert_auth" ON storage.objects;
CREATE POLICY "payment_slips_select_owner_or_admin" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-slips' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.is_app_admin()
    )
  );
CREATE POLICY "payment_slips_insert_owner" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-slips' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- listing photos: write only into your own folder
DROP POLICY IF EXISTS "listing_photos_auth_insert" ON storage.objects;
CREATE POLICY "listing_photos_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND owner = (SELECT auth.uid()));

-- Only real image types (no SVG) in image buckets.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'],
    file_size_limit = COALESCE(file_size_limit, 10485760)
WHERE id IN ('listing-photos', 'receipt-photos', 'dispute-evidence', 'payment-slips');

-- ---------------------------------------------------------------------------
-- 7. Function privileges: internal helpers are not callable by the public API.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.cleanup_seed_data() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.backfill_price_history(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_price_snapshots(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_price_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_price_snapshot(text, text, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_plant_for_listing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_qr_provenance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_listing_sold_for_order(uuid, uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 8. Seller QR self-verification goes through a constrained RPC (own listing only).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_listing_qr_verification(
  p_listing_id uuid,
  p_photo_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  UPDATE public.listings
  SET qr_verification_photo_url = p_photo_url,
      qr_verified_at = now(),
      qr_verified_by = auth.uid()
  WHERE id = p_listing_id
    AND seller_id = auth.uid()
    AND plant_id IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or has no QR provenance';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_listing_qr_verification(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_listing_qr_verification(uuid, text) TO authenticated;
