-- Guard transaction status transitions at the database level so a compromised
-- key or direct client update cannot skip the order lifecycle.

CREATE OR REPLACE FUNCTION public.guard_transaction_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Service role and admins can override for support actions.
  IF auth.role() = 'service_role' OR public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  IF (OLD.status = 'pending_payment' AND NEW.status IN ('paid_in_escrow', 'cancelled'))
     OR (OLD.status = 'paid_in_escrow' AND NEW.status IN ('shipped', 'disputed', 'cancelled'))
     OR (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'disputed', 'cancelled'))
     OR (OLD.status = 'delivered' AND NEW.status IN ('completed', 'disputed'))
     OR (OLD.status = 'completed' AND NEW.status = 'disputed')
     OR (OLD.status = 'disputed' AND NEW.status IN ('refunded', 'completed', 'cancelled'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid transaction status transition: % -> %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_transaction_status_transition ON public.transactions;
CREATE TRIGGER guard_transaction_status_transition
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_transaction_status_transition();
