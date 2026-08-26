-- Allow listing to return to 'active' after being marked 'sold'.
-- Needed so a cancelled/abandoned order restores the listing to the market.
CREATE OR REPLACE FUNCTION public.guard_listing_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  -- Allowed transitions:
  -- draft -> pending_review (submit for review)
  -- pending_review -> active (approve)
  -- pending_review -> rejected (reject)
  -- pending_review -> draft (send back to drafts)
  -- rejected -> pending_review (resubmit)
  -- active -> sold (purchase / manual mark)
  -- active -> withdrawn (withdraw)
  -- withdrawn -> active (relist)
  -- sold -> active (order cancelled / abandoned, relist)
  IF (OLD.status = 'draft' AND NEW.status = 'pending_review')
     OR (OLD.status = 'pending_review' AND NEW.status IN ('active', 'rejected', 'draft'))
     OR (OLD.status = 'rejected' AND NEW.status = 'pending_review')
     OR (OLD.status = 'active' AND NEW.status IN ('sold', 'withdrawn'))
     OR (OLD.status = 'withdrawn' AND NEW.status = 'active')
     OR (OLD.status = 'sold' AND NEW.status = 'active')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid listing status transition: % -> %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;