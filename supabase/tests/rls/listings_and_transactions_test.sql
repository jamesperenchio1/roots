-- Test database-level guards for listings and transactions.
-- Run locally with: supabase test db

BEGIN;
SELECT plan(6);

-- ============================================================================
-- Test profiles
-- ============================================================================
INSERT INTO public.profiles (id, display_name, is_banned)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Banned Seller', true),
  ('00000000-0000-0000-0000-000000000002', 'Good Seller', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 1. Banned users cannot insert listings
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $$ INSERT INTO public.listings (seller_id, price_thb, description, status)
     VALUES ('00000000-0000-0000-0000-000000000001', 100, 'Banned listing', 'pending_review') $$,
  'new row violates row-level security policy for table "listings"'
);

RESET ROLE;

-- ============================================================================
-- 2. Listing status transition guard
-- ============================================================================
INSERT INTO public.listings (id, seller_id, price_thb, description, status)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 100, 'Test listing', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT lives_ok(
  $$ UPDATE public.listings SET status = 'sold'
     WHERE id = '11111111-1111-1111-1111-111111111111' $$,
  'active -> sold is allowed'
);

UPDATE public.listings SET status = 'active'
WHERE id = '11111111-1111-1111-1111-111111111111';

SELECT throws_ok(
  $$ UPDATE public.listings SET status = 'draft'
     WHERE id = '11111111-1111-1111-1111-111111111111' $$,
  'Invalid listing status transition: active -> draft'
);

-- ============================================================================
-- 3. Transaction status transition guard
-- ============================================================================
INSERT INTO public.listings (id, seller_id, price_thb, description, status)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 100, 'Test listing 2', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, listing_id, buyer_id, seller_id, sale_price_thb, status)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 100, 'paid_in_escrow')
ON CONFLICT (id) DO NOTHING;

SELECT throws_ok(
  $$ UPDATE public.transactions SET status = 'completed'
     WHERE id = '33333333-3333-3333-3333-333333333333' $$,
  'Invalid transaction status transition: paid_in_escrow -> completed'
);

SELECT * FROM finish();
ROLLBACK;
