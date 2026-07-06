# Market Data

Market data powers price charts, trending panels, seller price suggestions, and the plant identifier's market estimate.

## Tables

### `price_snapshots`

Incremental daily aggregates per species and size category.

| Column | Purpose |
|---|---|
| `species_id` | Catalogue species identifier |
| `size_category` | `S`, `M`, `L`, `XL` or unspecified |
| `snapshot_date` | Aggregate date |
| `median_price_thb` | Median transaction price |
| `mean_price_thb` | Mean transaction price |
| `min_price_thb` / `max_price_thb` | Range |
| `sale_count` | Number of completed transactions |
| `listing_count` | Number of active listings |
| `avg_asking_price` | Average asking price of active listings |

## Incremental refresh

Postgres triggers recompute only the snapshot affected by a change:

- `refresh_price_snapshot(species_id, size_category, snapshot_date)` recalculates from active listings and completed transactions.
- `trg_listings_refresh_snapshot` fires on listing insert/update/delete.
- `trg_transactions_refresh_snapshot` fires when a transaction reaches `completed`.

This avoids full-table recalculation as the marketplace grows.

## Frontend usage

- `MarketPage` reads snapshots via `getPriceSnapshotsForSpecies` and renders `PriceChart`.
- `getMarketSpecies()` returns a union of catalogue species, currently listed species, and recently traded species so the selector is always useful.
- `CreateListingPage` and the plant identifier use `getSpeciesPriceStats` and catalogue ranges to suggest prices.

## Hydration

`hydratePriceSnapshots` fetches live rows from Supabase and merges them into the in-memory `PRICE_SNAPSHOTS` store, so synchronous getters work offline and during initial load.
