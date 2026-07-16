-- Guard offer status transitions so buyers cannot accept their own offers and
-- parties cannot jump to arbitrary states.

CREATE OR REPLACE FUNCTION public.guard_offer_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  -- pending -> accepted/rejected/countered/withdrawn
  -- countered -> accepted/rejected/countered/withdrawn
  IF (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected', 'countered', 'withdrawn'))
     OR (OLD.status = 'countered' AND NEW.status IN ('accepted', 'rejected', 'countered', 'withdrawn'))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid offer status transition: % -> %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_offer_status_transition ON public.offers;
CREATE TRIGGER guard_offer_status_transition
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_status_transition();
