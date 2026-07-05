-- Stores the bank transaction reference extracted from a verified slip.
-- Used to detect duplicate slips across orders.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_trans_ref text;

CREATE INDEX IF NOT EXISTS idx_transactions_payment_trans_ref
  ON transactions(payment_trans_ref);
