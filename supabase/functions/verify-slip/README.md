# verify-slip Edge Function

Auto-verifies buyer payment slips using [EasySlip](https://easyslip.com/).

## What it does

1. Receives a `transactionId`.
2. Loads the transaction and the uploaded slip from Supabase Storage.
3. Calls EasySlip with a temporary signed URL of the slip.
4. Checks that the slip amount matches the order total and is not a duplicate.
5. If valid, marks the transaction as `paid_in_escrow` and `payment_confirmed`.
6. If EasySlip is not configured or fails, returns `manual` so the seller can confirm manually.

## Setup

1. Sign up for an API key at https://developer.easyslip.com.
2. Set the secret on Supabase:

```bash
supabase secrets set EASYSLIP_API_KEY=your_api_key
```

3. Deploy the function:

```bash
supabase functions deploy verify-slip
```

## Environment variables

- `SUPABASE_URL` — set automatically by Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — set automatically by Supabase.
- `EASYSLIP_API_KEY` — your EasySlip API key.
