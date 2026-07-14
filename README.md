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

- **Frontend:** React 19 + Vite + TypeScript + Tailwind + shadcn/ui, routed with
  **HashRouter** (static-host friendly).
- **Backend:** Supabase (Postgres + Auth + Storage + Row Level Security), free tier.
  Project ref: `daacilgagkphafpjdcte`.
- **Payments:** Dynamic **PromptPay** QR generated client-side (EMVCo standard).
  Any Thai banking app scans it and pays the seller directly — no gateway or
  business registration required. There is **no payment webhook**: the buyer
  self-confirms payment (see trust caveats below).
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
3. **Browse & buy** — checkout renders a real PromptPay QR for the exact amount,
   payable to the seller. Confirming creates an escrow-style order.
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
  sanitisation; `src/lib/promptpay.ts` builds the EMVCo QR payload;
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
npm run build    # type-check (tsc) + production build (vite)
npm run test     # run unit tests
npm run test:ui  # interactive test UI
```

Supabase credentials ship with safe public defaults (see `.env.example`); access
is gated by RLS. Override via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` if
you fork the backend.

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
- ✅ **Payment-slip verification** — the buyer's slip is now *required* and saved
  to a private `payment-slips` bucket (was previously discarded). The order is
  created `payment_confirmed=false`; the **seller** reviews the slip (signed URL)
  and confirms receipt against their own bank, which unlocks shipping. Closes the
  one-click "I've paid" self-confirm hole.
- ✅ **Automated SlipOK verification** — the `verify-slip` edge function (called
  from checkout) downloads the slip, sends it to SlipOK, and on a genuine,
  amount-matching slip flips `payment_confirmed` server-side (service role) so no
  seller action is needed. Gated behind `SLIPOK_*` secrets; without them it
  returns `manual` and the seller-confirm path is used. A DB trigger
  (`guard_payment_confirmed`) ensures only the seller or the edge function — not
  the buyer — can set `payment_confirmed`.
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
2. Tighten the production checklist items below (email verification, admin
   bypass, storage-bucket listing policy, PromptPay slip verification).
3. Perf: the largest remaining chunk is `recharts` (~415KB) — consider a lighter
   charting lib or lazy-mounting charts below the fold.

**Workflow note:** development happens on `claude/exciting-allen-2j8tm2`, and
finished features are pushed **directly to `main`** (the owner opted out of PR
review for this cluster). Each Vercel preview/prod deploy is automatic.

---

## Production checklist

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- [x] Create the referenced tables with proper RLS + hydration
- [ ] Apply the latest `supabase/migrations/` files to the live DB (`supabase db push` or SQL Editor)
- [ ] Storage buckets exist/public with a 5MB limit (`listing-photos`)
- [ ] Tighten RLS policies (esp. `updateProfile`); add RLS policy tests
- [x] **PromptPay trust model:** buyer uploads a required payment slip; it is
      auto-verified via SlipOK when configured, else the seller confirms receipt
      manually before shipping. `payment_confirmed` is protected by a DB trigger
      (only the seller or the service-role edge function may set it — the buyer
      cannot forge it).
      - **To enable auto-verification:** set `SLIPOK_BRANCH_ID` and
        `SLIPOK_API_KEY` as secrets on the `verify-slip` edge function. Until
        then it returns `manual` and the seller-confirm flow is used.
      - *Next:* tighten the `payment-slips` storage SELECT policy to the two
        transaction parties; consider EasySlip/RDCW as alternative providers.
- [ ] Enable email verification (pilot auto-confirms accounts)
- [ ] Hide `loginAsLocalAdmin()` dev bypass before public launch
- [ ] Configure Supabase auth email templates + Storage CORS + custom domain
- [ ] Wire Sentry (or similar) into `src/lib/logger.ts`

---

## Architecture decisions

- **HashRouter** for static-host compatibility (Vercel/GitHub Pages/Netlify).
- **Client-side PromptPay** keeps the app free-tier; no payment gateway needed.
- **Live Supabase data only** — no fabricated listings; real data hydrates the
  in-memory store at boot.
- **In-memory store + Supabase hydration** (see Architecture) — fast synchronous
  reads, optimistic local writes; the trade-off is that any feature without a
  table + hydration path is session-only.
- **Manual chunk splitting** keeps initial JS reasonable; the largest vendor
  chunks are recharts (price charts) and the QR scanner.
