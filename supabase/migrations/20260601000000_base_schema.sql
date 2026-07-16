-- Base schema for the Roots marketplace.
--
-- These core tables were created manually during early development. This
-- migration captures them as CREATE TABLE IF NOT EXISTS so that fresh
-- environments (local reset, new forks, CI) can reproduce the schema from the
-- repository. On the existing production project the tables already exist, so
-- every statement here is a safe no-op.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_app_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT p.is_admin INTO is_admin FROM public.profiles p WHERE p.id = uid;
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Plant Lover'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Plant Lover',
  promptpay_id text,
  is_admin boolean NOT NULL DEFAULT false,
  strike_count int NOT NULL DEFAULT 0,
  is_banned boolean NOT NULL DEFAULT false,
  language_preference text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  avatar_url text,
  location text,
  sales_count int NOT NULL DEFAULT 0,
  onboarding_status jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.profiles IS 'Public profile row for each auth user, created by trigger on signup.';

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
CREATE POLICY "Profiles are publicly viewable"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plant_id uuid,
  has_qr_provenance boolean NOT NULL DEFAULT true,
  price_thb numeric NOT NULL CHECK (price_thb > 0),
  size_category text NOT NULL DEFAULT 'M' CHECK (size_category IN ('S','M','L','XL')),
  size_cm_range text,
  pot_size_cm int,
  description text NOT NULL DEFAULT '',
  delivery_options text[] NOT NULL DEFAULT '{ship}',
  shipping_cost_thb numeric,
  pickup_province text,
  pickup_location text,
  pickup_lat numeric,
  pickup_lng numeric,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('draft','pending_review','active','sold','withdrawn','rejected')),
  review_status text,
  qr_verification_photo_url text,
  qr_verified_at timestamptz,
  qr_verified_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text,
  review_notes text,
  view_count int NOT NULL DEFAULT 0,
  watch_count int NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  photos text[] NOT NULL DEFAULT '{}',
  image_url text,
  species_id text,
  species_scientific text,
  species_common_en text,
  species_common_th text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('aroid','hoya','cactus','orchid','succulent','fern','other')),
  seller_promptpay_id text,
  species_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_photo_update_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.listings IS 'Plant listings created by sellers.';

CREATE INDEX IF NOT EXISTS idx_listings_seller_status_created ON public.listings(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_species_status_price ON public.listings(species_id, status, price_thb);
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON public.listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_plant_id ON public.listings(plant_id);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listings are publicly readable" ON public.listings;
CREATE POLICY "Listings are publicly readable"
  ON public.listings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Listings insert own" ON public.listings;
CREATE POLICY "Listings insert own"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND seller_id = auth.uid()
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

DROP POLICY IF EXISTS "Listings update own" ON public.listings;
CREATE POLICY "Listings update own"
  ON public.listings FOR UPDATE
  USING (seller_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Listings delete own" ON public.listings;
CREATE POLICY "Listings delete own"
  ON public.listings FOR DELETE
  USING (seller_id = auth.uid() OR public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  plant_id uuid,
  sale_price_thb numeric NOT NULL CHECK (sale_price_thb > 0),
  platform_fee_thb numeric NOT NULL DEFAULT 0,
  seller_payout_thb numeric NOT NULL DEFAULT 0,
  shipping_cost_thb numeric,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid_in_escrow','shipped','delivered','completed','disputed','refunded','cancelled')),
  omise_charge_id text,
  tracking_number text,
  courier text,
  shipment_photo_url text,
  payment_slip_path text,
  payment_ref text,
  payment_trans_ref text,
  payment_confirmed boolean NOT NULL DEFAULT false,
  payment_confirmed_at timestamptz,
  delivery_method text NOT NULL DEFAULT 'ship' CHECK (delivery_method IN ('ship','pickup')),
  shipping_address jsonb,
  seller_promptpay_id text,
  species_label text,
  image_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  escrow_release_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Orders / transactions between buyers and sellers.';

CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON public.transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_trans_ref ON public.transactions(payment_trans_ref);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions view by party" ON public.transactions;
CREATE POLICY "Transactions view by party"
  ON public.transactions FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Transactions insert by buyer" ON public.transactions;
CREATE POLICY "Transactions insert by buyer"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND buyer_id = auth.uid());

DROP POLICY IF EXISTS "Transactions update by party" ON public.transactions;
CREATE POLICY "Transactions update by party"
  ON public.transactions FOR UPDATE
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Messages (legacy + v2 columns)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY,
  thread_id text,
  conversation_id uuid,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text','markdown','system')),
  reply_to_message_id text,
  forwarded_from_message_id text,
  edited_at timestamptz,
  edited_by uuid,
  deleted_at timestamptz,
  flagged_contact_info boolean NOT NULL DEFAULT false,
  is_system_event boolean NOT NULL DEFAULT false,
  system_event_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.messages IS 'Messages between users (legacy thread model + conversation v2).';

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages view by party" ON public.messages;
CREATE POLICY "Messages view by party"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Messages insert by sender" ON public.messages;
CREATE POLICY "Messages insert by sender"
  ON public.messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND sender_id = auth.uid());

DROP POLICY IF EXISTS "Messages update by sender" ON public.messages;
CREATE POLICY "Messages update by sender"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (sender_id = auth.uid() OR public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('order','shipment','dispute','message','offer','review','price_alert','system')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'User notification inbox.';

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications view own" ON public.notifications;
CREATE POLICY "Notifications view own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Notifications insert authenticated" ON public.notifications;
CREATE POLICY "Notifications insert authenticated"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Notifications update own" ON public.notifications;
CREATE POLICY "Notifications update own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Notifications delete own" ON public.notifications;
CREATE POLICY "Notifications delete own"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid() OR public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Price Alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species_id text NOT NULL,
  size_category text CHECK (size_category IS NULL OR size_category IN ('S','M','L','XL')),
  threshold_thb numeric NOT NULL CHECK (threshold_thb > 0),
  direction text NOT NULL CHECK (direction IN ('above','below')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.price_alerts IS 'User price alerts per species/size.';

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_species_size ON public.price_alerts(species_id, size_category);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Price alerts view own" ON public.price_alerts;
CREATE POLICY "Price alerts view own"
  ON public.price_alerts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Price alerts insert own" ON public.price_alerts;
CREATE POLICY "Price alerts insert own"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Price alerts update own" ON public.price_alerts;
CREATE POLICY "Price alerts update own"
  ON public.price_alerts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Price alerts delete own" ON public.price_alerts;
CREATE POLICY "Price alerts delete own"
  ON public.price_alerts FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Disputes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  opened_by text NOT NULL CHECK (opened_by IN ('buyer','seller')),
  reason text NOT NULL CHECK (reason IN ('DOA','mismatch','wrong_species','pests','root_rot','transit_damage','other')),
  description text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved_buyer','resolved_seller','resolved_partial')),
  admin_notes text,
  resolution_amount_thb numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

COMMENT ON TABLE public.disputes IS 'Disputes opened on transactions.';

CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON public.disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Disputes view by party" ON public.disputes;
CREATE POLICY "Disputes view by party"
  ON public.disputes FOR SELECT
  USING (
    public.is_app_admin()
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Disputes insert by party" ON public.disputes;
CREATE POLICY "Disputes insert by party"
  ON public.disputes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Disputes resolve by admin" ON public.disputes;
CREATE POLICY "Disputes resolve by admin"
  ON public.disputes FOR UPDATE
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Watchlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watch_type text NOT NULL CHECK (watch_type IN ('species','listing')),
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, watch_type, target_id)
);

COMMENT ON TABLE public.watchlist IS 'User watchlist for species and listings.';

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_target ON public.watchlist(watch_type, target_id);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Watchlist view own" ON public.watchlist;
CREATE POLICY "Watchlist view own"
  ON public.watchlist FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Watchlist insert own" ON public.watchlist;
CREATE POLICY "Watchlist insert own"
  ON public.watchlist FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Watchlist delete own" ON public.watchlist;
CREATE POLICY "Watchlist delete own"
  ON public.watchlist FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Species catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.species (
  id text PRIMARY KEY,
  scientific_name text NOT NULL,
  common_name_th text,
  common_name_en text,
  synonyms text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('aroid','hoya','cactus','orchid','succulent','fern','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  image_url text,
  description text,
  care_level text CHECK (care_level IS NULL OR care_level IN ('easy','moderate','advanced')),
  light_requirement text
);

COMMENT ON TABLE public.species IS 'Curated species taxonomy used for autocomplete and market data.';

CREATE INDEX IF NOT EXISTS idx_species_category ON public.species(category);
CREATE INDEX IF NOT EXISTS idx_species_scientific ON public.species(scientific_name);

ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Species are publicly readable" ON public.species;
CREATE POLICY "Species are publicly readable"
  ON public.species FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Species insert by admin" ON public.species;
CREATE POLICY "Species insert by admin"
  ON public.species FOR INSERT
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Species update by admin" ON public.species;
CREATE POLICY "Species update by admin"
  ON public.species FOR UPDATE
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());
