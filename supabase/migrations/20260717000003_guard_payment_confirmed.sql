-- Guard payment_confirmed so only the seller or the service role can mark a
-- transaction as paid. This closes a privilege escalation path where any
-- authenticated party (or compromised key) could release escrow by flipping
-- the boolean.

CREATE OR REPLACE FUNCTION public.guard_payment_confirmed()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_confirmed = true AND OLD.payment_confirmed = false THEN
    -- Service role is allowed for admin / backend flows.
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Only authenticated sellers can confirm payment';
    END IF;

    IF auth.uid() != OLD.seller_id THEN
      RAISE EXCEPTION 'Only the seller can confirm payment';
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
