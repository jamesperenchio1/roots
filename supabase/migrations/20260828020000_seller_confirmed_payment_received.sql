-- Seller-side "payment received" attestation for direct/P2P orders.
-- Distinct from and independent of the shipping timeline: the buyer already
-- has payment_confirmed/payment_confirmed_at (their attestation that they
-- paid); this adds the seller's parallel attestation that they received it,
-- so both parties have a visible trust/safety trail for direct payments.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS seller_confirmed_received_at timestamptz;
