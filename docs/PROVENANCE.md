# Provenance & QR

Each listing gets a persistent plant identity, an append-only transfer chain, and a signed QR code.

## Tables

### `plants`

- `id` (uuid)
- `species_id`
- `current_owner_id`
- `status` (`active`, `deceased`, `lost`)
- `qr_signature` — random signature used to verify authenticity
- `created_at`

### `transfers`

Append-only ownership history.

- `plant_id`
- `from_user_id` / `to_user_id`
- `transaction_id`
- `sale_price_thb`
- `transferred_at`

### `qr_scans`

Records every time a QR code is scanned.

- `plant_id`
- `scanner_user_id`
- `scan_source` (`camera`, `manual`, `url`)
- `ip_hash`, `user_agent_hash`
- `created_at`

## Triggers

- `create_plant_for_listing()` inserts a `plants` row when a listing is created.
- `record_transfer_on_completion()` appends a `transfers` row when a transaction status becomes `completed`.

## QR code format

```
https://<origin>/#/p/<plant_id>?s=<qr_signature>
```

The provenance page (`PlantQRPage`) fetches the plant and compares the query `s` parameter to the stored `qr_signature`. A mismatch shows a counterfeit warning.

## Scan history

`PlantQRPage` displays the plant identity, current owner, transfer chain, and last five scans. Anonymous scans are recorded with hashed identifiers for privacy.
