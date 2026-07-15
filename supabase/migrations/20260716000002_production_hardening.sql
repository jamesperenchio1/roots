-- Production hardening: fixes identified in the Supabase audit.
-- All changes are idempotent and safe to run against an existing schema.

-- ============================================================
-- 1. CRITICAL: record_transfer_on_completion must be SECURITY DEFINER
--    The transfers table has RLS WITH CHECK (false) for all writes.
--    Without SECURITY DEFINER the trigger runs as the calling user
--    and every attempt to insert a transfer record fails silently,
--    meaning ownership is never transferred on transaction completion.
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_transfer_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
  IF v_listing.plant_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.transfers (
    plant_id,
    from_user_id,
    to_user_id,
    transaction_id,
    sale_price_thb,
    transferred_at
  ) VALUES (
    v_listing.plant_id,
    NEW.seller_id,
    NEW.buyer_id,
    NEW.id,
    NEW.sale_price_thb,
    NEW.completed_at
  );

  UPDATE public.plants
  SET current_owner_id = NEW.buyer_id,
      updated_at = now()
  WHERE id = v_listing.plant_id;

  RETURN NEW;
END;
$$;

-- Recreate the trigger so the updated function is used.
DROP TRIGGER IF EXISTS transactions_transfer_trigger ON public.transactions;
CREATE TRIGGER transactions_transfer_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_transfer_on_completion();

-- ============================================================
-- 2. CRITICAL: Prevent duplicate payment slip race condition.
--    The verify-slip edge function checks for duplicate trans_ref
--    with a SELECT then UPDATE, which is not atomic. Two concurrent
--    requests with the same slip can both pass the check. A partial
--    unique index on non-null values enforces uniqueness at DB level.
-- ============================================================

DROP INDEX IF EXISTS idx_transactions_payment_trans_ref;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_transactions_payment_trans_ref
  ON public.transactions (payment_trans_ref)
  WHERE payment_trans_ref IS NOT NULL;

-- ============================================================
-- 3. HIGH: offers.status lacks a CHECK constraint.
--    Any arbitrary string can be stored. The TypeScript type
--    enforces this client-side but the database must too.
-- ============================================================

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_status_check;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn'));

-- ============================================================
-- 4. HIGH: offers.conversation_id should reference conversations.
--    Without the FK, orphaned conversation references accumulate
--    when conversations are deleted.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND constraint_name = 'offers_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.conversations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 5. HIGH SECURITY: cleanup_seed_data() is SECURITY DEFINER and
--    can be called by any authenticated user via supabase.rpc().
--    This function deletes large swaths of data. Guard it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_seed_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service-role callers or admins may run this.
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'cleanup_seed_data: permission denied';
  END IF;

  -- Disable triggers that prevent seed cleanup.
  ALTER TABLE public.transfers DISABLE TRIGGER transfers_prevent_delete;
  ALTER TABLE public.transfers DISABLE TRIGGER transfers_prevent_update;
  ALTER TABLE public.messages DISABLE TRIGGER messages_prevent_hard_delete;

  CREATE TEMP TABLE seed_users ON COMMIT DROP AS
    SELECT id FROM auth.users WHERE email LIKE '%@roots.seed';

  CREATE TEMP TABLE seed_plants ON COMMIT DROP AS
    SELECT id FROM public.plants WHERE current_owner_id IN (SELECT id FROM seed_users);

  CREATE TEMP TABLE seed_listings ON COMMIT DROP AS
    SELECT id FROM public.listings WHERE seller_id IN (SELECT id FROM seed_users);

  CREATE TEMP TABLE seed_conversations ON COMMIT DROP AS
    SELECT id FROM public.conversations WHERE created_by IN (SELECT id FROM seed_users);

  CREATE TEMP TABLE seed_transactions ON COMMIT DROP AS
    SELECT id FROM public.transactions WHERE seller_id IN (SELECT id FROM seed_users) OR buyer_id IN (SELECT id FROM seed_users);

  DELETE FROM public.transaction_events WHERE transaction_id IN (SELECT id FROM seed_transactions);
  DELETE FROM public.transactions WHERE seller_id IN (SELECT id FROM seed_users) OR buyer_id IN (SELECT id FROM seed_users);
  DELETE FROM public.transfers WHERE from_user_id IN (SELECT id FROM seed_users) OR to_user_id IN (SELECT id FROM seed_users) OR plant_id IN (SELECT id FROM seed_plants);
  DELETE FROM public.seller_reviews WHERE seller_id IN (SELECT id FROM seed_users) OR reviewer_id IN (SELECT id FROM seed_users);
  DELETE FROM public.reviews WHERE seller_id IN (SELECT id FROM seed_users) OR reviewer_id IN (SELECT id FROM seed_users);
  DELETE FROM public.offers WHERE seller_id IN (SELECT id FROM seed_users) OR buyer_id IN (SELECT id FROM seed_users);
  DELETE FROM public.comments WHERE author_id IN (SELECT id FROM seed_users) OR listing_id IN (SELECT id FROM seed_listings);
  DELETE FROM public.watchlist WHERE user_id IN (SELECT id FROM seed_users);
  DELETE FROM public.price_alerts WHERE user_id IN (SELECT id FROM seed_users);
  DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM seed_users);
  DELETE FROM public.user_locations WHERE profile_id IN (SELECT id FROM seed_users);
  DELETE FROM public.conversation_participants WHERE user_id IN (SELECT id FROM seed_users) OR conversation_id IN (SELECT id FROM seed_conversations);
  DELETE FROM public.messages WHERE sender_id IN (SELECT id FROM seed_users) OR recipient_id IN (SELECT id FROM seed_users) OR conversation_id IN (SELECT id FROM seed_conversations);
  DELETE FROM public.conversations WHERE created_by IN (SELECT id FROM seed_users);
  DELETE FROM public.listings WHERE seller_id IN (SELECT id FROM seed_users);
  DELETE FROM public.plants WHERE current_owner_id IN (SELECT id FROM seed_users);
  DELETE FROM public.qr_scans WHERE plant_id IN (SELECT id FROM seed_plants) OR scanner_user_id IN (SELECT id FROM seed_users);
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM seed_users);
  DELETE FROM auth.users WHERE email LIKE '%@roots.seed';

  ALTER TABLE public.transfers ENABLE TRIGGER transfers_prevent_update;
  ALTER TABLE public.transfers ENABLE TRIGGER transfers_prevent_delete;
  ALTER TABLE public.messages ENABLE TRIGGER messages_prevent_hard_delete;
END;
$$;

-- ============================================================
-- 6. MEDIUM SECURITY: comment_mentions INSERT policy.
--    "System can insert comment mentions" uses WITH CHECK (true),
--    allowing any authenticated user to insert a mention record
--    for any comment (even one they didn't write), which creates
--    false mention notifications for targeted users.
-- ============================================================

DROP POLICY IF EXISTS "System can insert comment mentions" ON public.comment_mentions;

CREATE POLICY "Comment authors can insert own mentions"
  ON public.comment_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_mentions.comment_id
        AND c.author_id = auth.uid()
    )
  );

-- ============================================================
-- 7. MEDIUM: conversations.last_message_id column type.
--    messages.id is text, but conversations.last_message_id is uuid.
--    The trigger casts NEW.id::uuid which works only because message
--    IDs happen to be UUID-formatted text. Align the column type to
--    text to remove the fragile implicit cast.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conversations'
      AND column_name = 'last_message_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.conversations
      ALTER COLUMN last_message_id TYPE text USING last_message_id::text;
  END IF;
END $$;

-- Now the trigger no longer needs the ::uuid cast.
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_id = NEW.id,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. MEDIUM: Missing updated_at auto-trigger on user_locations.
--    The app sets updated_at manually in every update call, which
--    is error-prone. Add a trigger for consistency.
-- ============================================================

DROP TRIGGER IF EXISTS user_locations_updated_at ON public.user_locations;
CREATE TRIGGER user_locations_updated_at
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 9. MEDIUM: Missing updated_at auto-trigger on plants.
--    Plants.updated_at is set manually in trigger bodies. Add an
--    explicit trigger so direct updates also maintain the timestamp.
-- ============================================================

DROP TRIGGER IF EXISTS plants_updated_at ON public.plants;
CREATE TRIGGER plants_updated_at
  BEFORE UPDATE ON public.plants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. MEDIUM PERFORMANCE: Missing index on price_alerts for the
--     check_price_alerts() trigger that scans by species_id and
--     size_category on every listing insert/update.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'price_alerts'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_price_alerts_species_size
      ON public.price_alerts (species_id, size_category)';
  END IF;
END $$;

-- ============================================================
-- 11. MEDIUM PERFORMANCE: Missing composite index on transactions
--     for the common seller/buyer status queries.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_seller_status
  ON public.transactions (seller_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer_status
  ON public.transactions (buyer_id, status, created_at DESC);

-- ============================================================
-- 12. MEDIUM PERFORMANCE: Missing index on notifications for
--     per-user unread queries (common hot path).
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
      ON public.notifications (user_id, read, created_at DESC)';
  END IF;
END $$;

-- ============================================================
-- 13. LOW: Revoke execute on cleanup_seed_data from anon/authenticated.
--     The admin check inside is the primary guard, but defense in
--     depth means non-service roles should not even see the function.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.cleanup_seed_data() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_seed_data() TO service_role;
