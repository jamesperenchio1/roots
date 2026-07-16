-- Tighten qr_scans INSERT so only the plant owner or an admin can record a scan.
-- Anonymous scans are intentionally dropped; the page still works read-only.

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QR scans are insertable by authenticated scanners" ON public.qr_scans;

CREATE POLICY "QR scans are insertable by owner or admin"
  ON public.qr_scans FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      scanner_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.plants p
        WHERE p.id = qr_scans.plant_id
          AND p.current_owner_id = auth.uid()
      )
      OR public.is_app_admin()
    )
  );
