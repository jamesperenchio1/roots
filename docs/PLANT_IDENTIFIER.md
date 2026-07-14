# Plant Identifier

A free, market-aware plant identification flow built into the Roots marketplace.

## User flow

1. The user visits `/identify`.
2. A `plant_identification_requests` row is created (anonymous or authenticated).
3. The wizard walks the user through evidence types: overall, leaf, stem, node, flower, variegation, pot, etc.
4. Files are uploaded to the `identification-media` Supabase Storage bucket and recorded in `identification_uploaded_media`.
5. On the context step the user can add country and growing conditions, then clicks **Identify**. A sticky checklist sidebar shows every evidence step and what is still needed.
6. The growing-conditions value is persisted to `plant_identification_requests.growing_conditions` before the providers run.
7. The frontend runs the registered provider ensemble and merges the results.
8. If confidence is too low or critical evidence is missing, the request moves to `needs_evidence` and the wizard asks for the missing shot.
9. Once confident enough, an `identification_results` row is saved together with per-provider details, a `market_estimates` row, and `processing_history` audit entries.
10. Authenticated users can click **Sell this plant** to pre-fill `/seller-dashboard/listings/new?identificationId=<id>&speciesId=<id>`.

## Architecture

```
src/lib/identification/
├── types.ts              Shared TS interfaces
├── provider.ts           Provider contract
├── evidence.ts           Result merging + next-evidence logic
├── registry.ts           Provider wiring
├── upload.ts             Storage upload pipeline
├── marketEstimate.ts     Marketplace valuation builder
├── api-identification.ts Supabase CRUD helpers
└── providers/
    ├── mockProvider.ts   Deterministic free fallback
    ├── plantNetProvider.ts Free PlantNet v2 integration
    └── ensembleProvider.ts Parallel runner
```

## Providers

The default ensemble is `MockProvider` only. If `VITE_PLANTNET_API_KEY` is set, `PlantNetProvider` is added first. Both are free; the design intentionally avoids paid LLM calls in the default path.

- **MockProvider**: Rule-based, deterministic, requires overall + leaf + stem for high confidence. Useful for development and as a guaranteed fallback.
- **PlantNetProvider**: Calls `https://my-api.plantnet.org/v2/identify/all`. Returns confidence 0 if the key is missing or the network fails.
- **EnsembleProvider**: Runs every provider in parallel and calls `mergeProviderResults`.

`mergeProviderResults` weights by confidence and penalises disagreement using the coefficient of variation.

## Evidence rules

Critical evidence: `overall`, `leaf`, `stem`.
`decideNextEvidence` returns the most useful missing evidence type when confidence is below 85% or critical evidence is absent.

## Market estimate

`buildMarketEstimate` looks up the matched species in the catalogue and marketplace:

- Active listings → average asking price, low, high.
- `price_snapshots` → median, recent sales count, trend.
- If data is insufficient, it falls back to the catalogue price range from `ALL_SPECIES`.

The estimate is persisted in `market_estimates` and shown on the result card.

## Database tables

- `plant_identification_requests`
- `identification_uploaded_media`
- `identification_results`
- `identification_provider_results`
- `market_estimates`
- `processing_history`

RLS allows public/anonymous reads and inserts so the feature works without login. Authenticated requests are scoped to the owner.
