# Migration state

This project's migrations have drifted between the repository and the live
Supabase project (`daacilgagkphafpjdcte`). This file records the reconciliation
so nobody re-applies an old migration on top of a newer one.

## Why the drift exists

Some migrations were applied through the Supabase CLI/MCP, which stamps them
with the *current* timestamp instead of the version in the filename. Others were
applied before migration tracking existed (the base schema). As a result, the
same logical change can appear in `supabase_migrations.schema_migrations` under
a different version string than the local file.

## Reconciled on 2026-09-21

All local migration versions are now recorded in
`supabase_migrations.schema_migrations`, so `supabase db push` will not try to
re-apply them. Recorded with `supabase migration repair --status applied`
semantics (direct inserts).

Applied during reconciliation (these had never run against the live database):

| Local file | Effect |
| --- | --- |
| `20260717000001_profile_onboarding` | Adds `profiles.onboarding_status`. The onboarding tutorial reads **and writes** this column, so without it the tutorial re-opened on every visit and could never be dismissed. |
| `20260718000000_create_contact_submissions` | Creates the `contact_submissions` table. |
| `20260718000001_add_common_indexes` | Adds offers/listings/transactions indexes. |
| `20260722000000_fix_listings_rls_and_status_guards` | Adds the `guard_listing_status_transition` trigger (includes the later `sold -> active` relist rule). |
| `20260722000001_transaction_status_transition_guard` | Adds the transaction lifecycle guard trigger. |
| `20260722000002_offer_status_transition_guard` | Adds the offer status guard trigger. |
| `20260722000003_qr_scans_insert_restrict` | Restricts `qr_scans` inserts to the plant owner or an admin. |
| `20260716000001_watchlist_rls` | Watchlist table + row-level security. |
| `20260716000002_production_hardening` | See below. |

### `20260716000002_production_hardening` was broken

It had never applied successfully because section 4 referenced
`offers.conversation_id`, which did not exist on the live database — so the
whole migration rolled back. The app *does* read and write that column, meaning
offers could never be linked to their conversation. The file now creates the
column before adding the foreign key.

It also fixes issues that were live until this reconciliation:

- `record_transfer_on_completion` is now `SECURITY DEFINER`, so plant ownership
  actually transfers when a transaction completes (previously every insert into
  `transfers` failed silently under RLS).
- Unique partial index on `transactions.payment_trans_ref` (duplicate payment
  slip race).
- `offers.status` CHECK constraint and `offers.conversation_id` FK.
- `cleanup_seed_data()` is guarded by an admin check and its `EXECUTE` privilege
  is revoked from `anon`/`authenticated` — previously any authenticated user
  could call it and delete large amounts of data.

## Rules going forward

1. Do **not** run `supabase db push` without reviewing `supabase migration list`
   first; the version strings in this repo do not match the live history.
2. When writing a new migration, use the CLI so the version matches the file.
3. Long-running data backfills are exposed as functions rather than inline
   statements, so they can be run separately from the DDL:
   `SELECT public.backfill_price_snapshots(90);`
