-- Fix listings RLS regression from 20260716000000_listings_rls_and_plant_trigger.sql
-- and add a server-side status transition guard so sellers cannot move listings
-- to arbitrary states.

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listings insert own" ON public.listings;
DROP POLICY IF EXISTS "Listings insert own or admin" ON public.listings;

CREATE POLICY "Listings insert own"
  ON public.listings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND seller_id = auth.uid()
    AND NOT COALESCE((SELECT is_banned FROM public.profiles WHERE id = auth.uid()), false)
  );

-- Status transition guard for listings.
-- Admins and service role bypass the state machine for support actions.
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
  IF (OLD.status = 'draft' AND NEW.status = 'pending_review')
     OR (OLD.status = 'pending_review' AND NEW.status IN ('active', 'rejected', 'draft'))
     OR (OLD.status = 'rejected' AND NEW.status = 'pending_review')
     OR (OLD.status = 'active' AND NEW.status IN ('sold', 'withdrawn'))
     OR (OLD.status = 'withdrawn' AND NEW.status = 'active')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid listing status transition: % -> %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS guard_listing_status_transition ON public.listings;
CREATE TRIGGER guard_listing_status_transition
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_status_transition();
