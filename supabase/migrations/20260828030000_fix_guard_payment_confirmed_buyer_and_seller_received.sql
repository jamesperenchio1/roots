-- Fix guard_payment_confirmed(): the original trigger (see
-- 20260717000003_guard_payment_confirmed.sql) required
-- auth.uid() = OLD.seller_id to flip payment_confirmed true, under the
-- mental model that the seller attests "I received escrow payment."
--
-- But the actual, currently-shipped confirmDirectPayment() function
-- (src/lib/api.ts) has the BUYER set payment_confirmed = true -- the buyer
-- attesting "I sent payment directly to the seller." This contradicted the
-- trigger's ownership check, so for any real (non-admin, non-service-role)
-- buyer, the UPDATE would fail with 'Only the seller can confirm payment' --
-- silently breaking the buyer-side "Confirm payment" button in
-- src/page-components/OrderPage.tsx. Fix the ownership check to match the
-- real semantic: auth.uid() = OLD.buyer_id.
--
-- Separately, the new seller_confirmed_received_at column (added in
-- 20260828020000_seller_confirmed_payment_received.sql) has no
-- database-level guard at all -- only an application-level check inside
-- confirmDirectPaymentReceived() in src/lib/api.ts. Since the RLS policy for
-- updating transactions ("Transactions party update") is row-level only
-- (buyer_id = auth.uid() OR seller_id = auth.uid() OR is_app_admin()), a
-- buyer (or anyone calling PostgREST directly) could set
-- seller_confirmed_received_at on their own transaction, forging the
-- seller's attestation. Add an equivalent column-level guard for it: a
-- transition from NULL to non-NULL requires auth.uid() = OLD.seller_id (or
-- service_role).
--
-- Both checks live in the same trigger function since they're the same
-- buyer/seller-attestation concept, following the established pattern of
-- CREATE OR REPLACE FUNCTION on the same function name/trigger to cleanly
-- supersede the prior definition (see
-- 20260825000000_fix_price_snapshot_security_definer.sql).

CREATE OR REPLACE FUNCTION public.guard_payment_confirmed()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_confirmed = true AND OLD.payment_confirmed = false THEN
    -- Service role is allowed for admin / backend flows.
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Only authenticated buyers can confirm payment';
    END IF;

    IF auth.uid() != OLD.buyer_id THEN
      RAISE EXCEPTION 'Only the buyer can confirm payment';
    END IF;
  END IF;

  IF NEW.seller_confirmed_received_at IS NOT NULL AND OLD.seller_confirmed_received_at IS NULL THEN
    -- Service role is allowed for admin / backend flows.
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Only authenticated sellers can confirm payment received';
    END IF;

    IF auth.uid() != OLD.seller_id THEN
      RAISE EXCEPTION 'Only the seller can confirm payment received';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_payment_confirmed ON public.transactions;
CREATE TRIGGER guard_payment_confirmed
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_confirmed();
