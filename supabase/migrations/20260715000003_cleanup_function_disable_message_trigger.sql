CREATE OR REPLACE FUNCTION public.cleanup_seed_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
