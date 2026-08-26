# Root — Thailand's Plant Marketplace 🌿

A marketplace for trading plants (everyday herbs to rare aroids) with permanent
QR provenance, transparent price history, and PromptPay payments. Built for Thai
nurseries and collectors.

> **For the next developer / AI agent:** read the
> [Architecture](#architecture-read-this-first) and
> [Current state & where to pick up](#current-state--where-to-pick-up) sections
> first. They explain the one non-obvious thing about this codebase (the
> in-memory store hydrated from Supabase) and exactly what is and isn't finished.

---

## Stack

- **Frontend:** Next.js 15 App Router + React 19 + TypeScript + Tailwind + shadcn/ui.
- **Backend:** Supabase (Postgres + Auth + Storage + Row Level Security), free tier.
  Project ref: `daacilgagkphafpjdcte`.
- **Payments:** Stripe + direct (P2P). Buyers pay online via Stripe Payment
  Element (cards / bank) or arrange direct payment with the seller in chat
  (Binance-P2P style — the platform does not verify direct payments). Stripe
  orders are held in escrow and settled to sellers via Stripe Connect Express
  transfers; `stripe-webhook` updates order status automatically.
- **Testing:** Vitest + jsdom + @testing-library/react.
- **Deploy:** Vercel (preview deploy per push; production tracks `main`).

---

## How it works (user flows)

1. **Sign up** — creates a real Supabase auth user + `profiles` row (display name,
   PromptPay ID, province). New accounts are auto-confirmed for the pilot.
2. **List a plant** — upload photos to Supabase Storage, pick a species from the
   curated taxonomy, set price, size, delivery options. Pickup listings can carry
   an area/landmark plus optional exact GPS pin. A provenance QR is generated for
   the physical plant tag.
3. **Browse & buy** — at checkout the buyer picks a payment method: **Stripe**
   (pay online via Payment Element; funds are held in escrow) or **Direct**
   (arrange and pay the seller in chat; the platform does not verify funds, so
   pay at your own risk). Confirming creates an order.
4. **Fulfil** — orders move `paid_in_escrow → shipped → delivered → completed`.
   Sellers mark shipped (courier + tracking + optional photo of the packed box);
   the exact pickup pin is revealed to the buyer post-purchase.
5. **Social layer** — offers/negotiation, in-app messaging, seller reviews,
   watchlists, price alerts, notifications, and a dispute flow.

The catalog, sellers, and orders show **only real Supabase activity** — there is
no seeded demo data. A curated species taxonomy (names, care info, reference
photos) is retained in `src/data/` to power search, autocomplete, and listing
creation.

---

## Architecture (read this first)

**The single most important thing to understand:** the app keeps **module-level
in-memory arrays** as its working store, and hydrates them from Supabase at boot.

- `src/data/mockData.ts` exports mutable arrays: `USERS`, `LISTINGS`,
  `TRANSACTIONS`, `OFFERS`, `NOTIFICATIONS`, `REVIEWS`, `MESSAGES`, `WATCHLIST`,
  `PRICE_ALERTS`, `DISPUTES`, `TRANSFERS`. These ship **empty** (no fake data).
- On boot, `hydratePublicData()` and `hydrateUserTransactions()`
  (`src/lib/api.ts`) fetch from Supabase and fill those arrays via `map*()`
  functions.
- **Reads** in the UI are mostly *synchronous* against these arrays
  (e.g. `getNotifications`, `getOffersForSeller`, `getReviewsBySeller`).
- **Writes** go to Supabase **and** push/patch the local array so the UI updates
  without a refetch.

Consequence: a feature only **persists across reloads** if (a) its Supabase table
exists and (b) there's a hydration path that loads it at boot. Several social
features have the table/hydration missing and currently fall back to
in-memory-only (they work in-session, then vanish on reload). See the table below.

Other conventions:
- `src/lib/api.ts` is the single data-access layer — all Supabase calls live here.
- `src/lib/supabase.ts` holds the client; `src/lib/validation.ts` does input
  sanitisation; `src/lib/platform-config.ts` holds the platform fee config
  (currently 0% — the platform takes no fee during the pilot);
  `src/lib/logger.ts` is the logging shim (wire Sentry here).
- Auth is in `src/hooks/useAuth.tsx`; route guards are `AuthGuard`/`AdminGuard`.

---

## Database

Supabase Postgres, RLS enabled on all existing tables. A trigger auto-creates a
`profiles` row on signup. Storage bucket `listing-photos` is used for all image
uploads (listing photos, shipment photos, dispute evidence).

### Tables that EXIST

| Table          | Notes |
| -------------- | ----- |
| `profiles`     | id (=auth.users.id), display_name, location, promptpay_id, avatar_url, is_admin, language_preference, strike_count, is_banned, rating, sales_count |
| `listings`     | species fields, category, price_thb, size, description, `delivery_options[]`, `tags[]`, `shipping_cost_thb`, `pickup_province`, **`pickup_location`/`pickup_lat`/`pickup_lng`**, photos[], view/watch counts |
| `transactions` | buyer/seller/listing, pricing, status, delivery_method, shipping_address, tracking_number, courier, `shipment_photo_url`, **`payment_slip_path`/`payment_ref`/`payment_confirmed`/`payment_confirmed_at`**, timestamps |
| `messages`     | thread_id, sender/recipient, listing_id, content |
| `watchlist`    | user_id, watch_type, target_id |
| `notifications`| user_id, type, title, message, link, read — RLS owner-only read/update/delete, any-authenticated insert. Hydrated per-user at login; bell/panel react via an external store |
| `offers`       | listing/buyer/seller, offer_price_thb, message, status, counter_price_thb — RLS both-parties read, buyer-only insert, either-party update. Hydrated at login + on dashboard tabs |
| `reviews`      | transaction/listing/reviewer/seller, rating, comment, tags — RLS public read, author-only write. Hydrated for all sellers at boot (shown on public pages) |
| `price_alerts` | user_id, species_id, size_category, threshold_thb, direction — RLS owner-only. Hydrated per-user at login |
| `disputes`     | transaction_id, opened_by, reason, description, evidence_urls, status, admin_notes, resolution_amount_thb — RLS parties-or-admin read, party insert, admin-only resolve. Hydrated at login + admin view |

### All code-referenced tables now exist ✅

Every table that `src/lib/api.ts` writes to is now real and durable. The
reference pattern for adding any future persistent feature is: **create the
table (+RLS) → add a `map*` + `hydrate*` in `api.ts` → call `hydrate*` from
`useAuth` (per-user) or `hydratePublicData` (public) and/or the relevant page
when its tab opens.** The `transfers` array (provenance chain) is the only
remaining in-memory-only structure and is derived, not user-written.

> Schema changes live in `supabase/migrations/` and are applied to project
> `daacilgagkphafpjdcte` with `supabase db push` (or by running the SQL in the
> Supabase Dashboard SQL Editor). The latest migrations add listings RLS policies,
> the watchlist table + RLS, and the `SECURITY DEFINER` plant-creation trigger.

---

## Project map

```
src/
  pages/         # one component per route (Browse, Listing, Checkout, Order,
                 # SellerDashboard, Dashboard, Messages, Admin, Dispute, etc.)
  components/    # shared UI + feature widgets (gallery lightbox lives in
                 # ListingPage; MakeOfferModal, MarkShippedModal, Notification*,
                 # PriceChart, WeatherWidget, ProvenanceInfo, ...)
  components/ui/ # shadcn/ui primitives
  lib/           # api.ts (data layer), supabase, promptpay, validation,
                 # weather, logger, utils, perenual (care data)
  hooks/         # useAuth, useDebounce, usePagination, useRecentlyViewed, ...
  data/          # mockData.ts (the in-memory store + species taxonomy/images)
  types/         # index.ts — all shared TypeScript interfaces
```

---

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # type-check (tsc) + production build (next)
npm run test     # run unit tests
npm run test:ui  # interactive test UI
```

Supabase credentials are configured via environment variables (see `.env.example`);
access is gated by RLS.

**Always run `npm run build` before pushing** — it type-checks the whole project.

---

## Current state & where to pick up

Active work is a **UX-improvement cluster**. Recently shipped to `main`:

- ✅ **Precise pickup location** — sellers add an area/landmark + optional GPS pin
  on create-listing; public listing shows the area text, the exact pin is
  revealed to the buyer on the order page after purchase.
- ✅ **Shipment photo** — sellers upload a photo of the packed box when marking an
  order shipped; buyer sees it on the order page. (`MarkShippedModal`, `OrderPage`)
- ✅ **Schema fix** — `listings.tags` and `listings.shipping_cost_thb` columns
  were missing, so that data was silently dropped on insert; added them.
- ✅ **Listing image gallery** — full-screen lightbox with prev/next + keyboard
  nav, image counter, and all thumbnails (was capped at 4). (`ListingPage`)
- ✅ **Durable notifications** — `notifications` table + per-user hydration; the
  bell/panel now react to changes via an external store (`subscribeNotifications`).
- ✅ **Durable offers** — `offers` table + hydration; `createOffer` reads back the
  DB id so respond/withdraw target the right row after a reload.
- ✅ **Bundle optimization** — split `react` and `@supabase/supabase-js` into
  separate cacheable vendor chunks; app chunk ~540KB → ~294KB.
- ✅ **Durable reviews / price_alerts / disputes** — the last three ephemeral
  features now persist (tables + RLS + hydration). All social features survive
  reload.
- ✅ **Two-payment model** — buyers choose **Stripe** (online via Payment
  Element; funds held in escrow, settled to the seller via Stripe Connect
  Express transfer on completion) or **Direct** (Binance-P2P style payment
  arranged in chat; the platform does not verify funds and the order advances
  via manual confirmations). Checkout re-routes Stripe redirects through
  `/checkout/complete`.
- ✅ **Stripe payouts & seller onboarding** — sellers connect a Stripe Express
  account from the dashboard (Payouts tab); `process-payout` transfers to the
  seller's connected account once an order completes (Stripe orders only).
- ✅ **Platform fee = 0%** — the platform takes no fee during the pilot
  (`PLATFORM_FEE_PERCENT` defaults to 0 in `src/lib/platform-config.ts`); all
  fee UI/strings were removed.
- ✅ **Real marketplace data everywhere** — market charts, trending panels
  (Hot/High-value/Cooling Off), species pages, and browse listings are now
  populated from live Supabase data instead of empty/mock state.
- ✅ **Species wiki** — species detail pages enrich the local catalogue with
  GBIF, iNaturalist, Wikipedia, and Perenual care data.
- ✅ **Listings RLS + plant trigger** — sellers can insert listings (new migration
  adds RLS and runs the plant-creation trigger as `SECURITY DEFINER`).
- ✅ **Working watchlist & dashboard** — watchlist and messages are hydrated and
  subscribe to realtime updates; offers have richer actions and color-coded
  statuses.
- ✅ **Chat polish** — stable scroll (no teleport on typing), throttled typing
  indicators, and efficient realtime channel reuse.
- ✅ **Thai i18n actually switches** — Thai resources are loaded on demand; all
  hard-coded UI strings are now translated.

**Next up (suggestions):**

1. Apply the latest `supabase/migrations/` files to the live DB if not already
   done (`supabase db push` or run them in the Supabase SQL Editor).
2. Configure the Stripe webhook endpoint (`/functions/v1/stripe-webhook`) in the
   Stripe dashboard (test + live) with `STRIPE_WEBHOOK_SECRET`, and set the
   Stripe env vars (see below).
3. Tighten the production checklist items below (email verification, admin
   bypass, storage-bucket listing policy).
4. Perf: the largest remaining chunk is `recharts` (~415KB) — consider a lighter
   charting lib or lazy-mounting charts below the fold.

**Workflow note:** finished features are pushed **directly to `main`** (the
owner opted out of PR review for this cluster). Each Vercel preview/prod deploy
is automatic.

---

## Production checklist

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- [x] Create the referenced tables with proper RLS + hydration
- [ ] Apply the latest `supabase/migrations/` files to the live DB (`supabase db push` or SQL Editor)
- [ ] Storage buckets exist/public with a 5MB limit (`listing-photos`)
- [ ] Tighten RLS policies (esp. `updateProfile`); add RLS policy tests
- [ ] **Stripe payment trust model:** set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
      `STRIPE_CONNECT_CLIENT_ID` (test + live) in Vercel. Configure the
      `stripe-webhook` endpoint in the Stripe dashboard (test + live) so order
      status updates automatically. Sellers connect a Stripe Express account
      from the Payouts tab to receive transfers.
      - *Direct (P2P) payments are not platform-verified* — the buyer pays the
        seller in chat at their own risk; the platform shows a trust warning.
      - *Note:* Thailand-based platforms cannot self-serve Stripe Express
        accounts for Thai connected accounts via the API in all cases — contact
        Stripe sales if onboarding fails.
- [ ] Enable email verification (pilot auto-confirms accounts)
- [ ] Hide `loginAsLocalAdmin()` dev bypass before public launch
- [ ] Configure Supabase auth email templates + Storage CORS + custom domain
- [ ] Wire Sentry (or similar) into `src/lib/logger.ts`

---

## Architecture decisions

- **App Router routes** for all pages (no HashRouter); a client `HashRedirect`
  shim rewrites legacy `#/…` links for static-host compatibility
  (Vercel/GitHub Pages/Netlify).
- **Client-side Stripe + direct payments** keeps the app free-tier; no gateway
  processing fees on the platform beyond Stripe's own rates.
- **Live Supabase data only** — no fabricated listings; real data hydrates the
  in-memory store at boot.
- **In-memory store + Supabase hydration** (see Architecture) — fast synchronous
  reads, optimistic local writes; the trade-off is that any feature without a
  table + hydration path is session-only.
- **Manual chunk splitting** keeps initial JS reasonable; the largest vendor
  chunks are recharts (price charts) and the QR scanner.
