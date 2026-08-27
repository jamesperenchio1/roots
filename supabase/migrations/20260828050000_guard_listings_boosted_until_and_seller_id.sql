-- The "Listings update own or admin" RLS policy (see
-- 20260716000000_listings_rls_and_plant_trigger.sql) is row-level only
-- (seller_id = auth.uid() OR is_app_admin()), with no column-level
-- restriction. That means any authenticated seller can directly PATCH
-- their own listing's boosted_until to any future date via the normal
-- anon-key client, completely bypassing the paid Boost flow (Stripe,
-- tier validation, the listing_boosts ledger -- see
-- 20260828040000_listing_boosts.sql). The stripe-boost-checkout webhook
-- already writes boosted_until via the service-role client, so a guard
-- that only blocks non-service-role changes leaves that flow unaffected.
--
-- Add a BEFORE UPDATE trigger that rejects any change to boosted_until
-- unless auth.role() = 'service_role', following the same
-- column-level-guard-via-trigger pattern established for
-- guard_payment_confirmed() (20260717000003_guard_payment_confirmed.sql,
-- as fixed in
-- 20260828030000_fix_guard_payment_confirmed_buyer_and_seller_received.sql).
--
-- Also tighten the "Listings update own or admin" policy with
-- WITH CHECK (seller_id = auth.uid()) so a seller cannot reassign a
-- listing's seller_id on update (admins are already exempted via the
-- USING clause's is_app_admin() OR-branch, which still applies since
-- WITH CHECK is only added to the USING-based policy, not replacing it
-- with something more restrictive for admins).

CREATE OR REPLACE FUNCTION public.guard_listing_boosted_until()
RETURNS trigger AS $$
BEGIN
  IF NEW.boosted_until IS DISTINCT FROM OLD.boosted_until THEN
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'boosted_until can only be set via the Boost payment flow';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_listing_boosted_until ON public.listings;
CREATE TRIGGER guard_listing_boosted_until
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_listing_boosted_until();

DROP POLICY IF EXISTS "Listings update own or admin" ON public.listings;
CREATE POLICY "Listings update own or admin"
  ON public.listings FOR UPDATE
  USING (seller_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_app_admin());
