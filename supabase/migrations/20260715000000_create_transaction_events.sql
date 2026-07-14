-- Audit trail for every transaction/order status change and seller/buyer action.

CREATE TABLE IF NOT EXISTS public.transaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'status_change', 'payment_confirmed', 'shipped', 'delivered',
    'completed', 'disputed', 'refunded', 'cancelled', 'note'
  )),
  status_from text,
  status_to text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transaction_events IS 'Append-only audit log of seller/buyer order lifecycle events.';

CREATE INDEX IF NOT EXISTS idx_transaction_events_transaction_id
  ON public.transaction_events (transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_events_actor_id
  ON public.transaction_events (actor_id, created_at DESC);

ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction events visible to participants and admins"
  ON public.transaction_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_events.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid() OR public.is_app_admin(auth.uid()))
    )
  );

CREATE POLICY "System can insert transaction events"
  ON public.transaction_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_events.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid() OR public.is_app_admin(auth.uid()))
    )
  );

-- Auto-log every status change on transactions.
CREATE OR REPLACE FUNCTION public.log_transaction_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.transaction_events (
      transaction_id,
      actor_id,
      event_type,
      status_from,
      status_to
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      OLD.status,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS transactions_status_change_event ON public.transactions;
CREATE TRIGGER transactions_status_change_event
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_transaction_status_change();

-- Also log the initial creation event so the full lifecycle is captured.
CREATE OR REPLACE FUNCTION public.log_transaction_created()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.transaction_events (
    transaction_id,
    actor_id,
    event_type,
    status_to
  ) VALUES (
    NEW.id,
    NEW.buyer_id,
    'created',
    NEW.status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS transactions_created_event ON public.transactions;
CREATE TRIGGER transactions_created_event
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_transaction_created();
