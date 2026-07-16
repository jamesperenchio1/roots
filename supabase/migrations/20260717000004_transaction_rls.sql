-- Re-apply transaction RLS policies to ensure authorization is consistent
-- across environments. Existing production policies are idempotently dropped
-- and recreated.

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions buyer-seller read" ON public.transactions;
CREATE POLICY "Transactions buyer-seller read"
  ON public.transactions FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_app_admin());

DROP POLICY IF EXISTS "Transactions buyer insert" ON public.transactions;
CREATE POLICY "Transactions buyer insert"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND buyer_id = auth.uid());

DROP POLICY IF EXISTS "Transactions seller update" ON public.transactions;
CREATE POLICY "Transactions seller update"
  ON public.transactions FOR UPDATE
  USING (seller_id = auth.uid() OR public.is_app_admin())
  WITH CHECK (seller_id = auth.uid() OR public.is_app_admin());
