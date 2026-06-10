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
| `transactions` | buyer/seller/listing, pricing, status, delivery_method, shipping_address, tracking_number, courier, **`shipment_photo_url`**, timestamps |
| `messages`     | thread_id, sender/recipient, listing_id, content |
| `watchlist`    | user_id, watch_type, target_id |

### Tables the code USES but that DO NOT EXIST yet ⚠️

`src/lib/api.ts` calls `.from(...)` on these, wrapped in try/catch that logs a
warning and falls back to the in-memory array. **Create these (with RLS + a
hydration path) to make the corresponding feature durable:**

| Missing table  | Feature it backs              | UI status |
| -------------- | ----------------------------- | --------- |
| `offers`       | Make-an-offer / negotiation   | UI built (`MakeOfferModal`, `OfferCard`) |
| `notifications`| In-app notifications          | UI built (`NotificationBell`, `NotificationPanel`) |
| `reviews`      | Seller reviews                | UI built (`ReviewForm`, `ReviewSection`) |
| `price_alerts` | Price-drop alerts             | UI built (in dashboard) |
| `disputes`     | Dispute resolution            | UI built (`DisputePage`) |

> Migrations are applied via the Supabase MCP `apply_migration` tool against
> project `daacilgagkphafpjdcte`. There is no local `supabase/migrations/`
> directory — schema changes are made directly on the remote project.

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

**Next up in the cluster:**

1. **Offers** — the UI and `api.ts` helpers exist, but the `offers` **table is
   missing**, so offers don't survive reload. Pick up by: creating the `offers`
   table (+RLS), adding a hydration path, and removing the in-memory fallback.
2. **Notifications UX** — same situation: `NotificationBell`/`NotificationPanel`
   and `notify*` helpers exist, but the `notifications` table is missing and
   there is no boot-time hydration (`getNotifications` only reads the local
   array). Create the table, hydrate per-user on login, then polish the UX.

The same "create table + hydrate" pattern applies to `reviews`, `price_alerts`,
and `disputes` if those need to become durable.

**Workflow note:** development happens on `claude/exciting-allen-2j8tm2`, and
finished features are pushed **directly to `main`** (the owner opted out of PR
review for this cluster). Each Vercel preview/prod deploy is automatic.

---

## Production checklist

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- [ ] Create the **missing tables** above with proper RLS + hydration
- [ ] Storage buckets exist/public with a 5MB limit (`listing-photos`)
- [ ] Tighten RLS policies (esp. `updateProfile`); add RLS policy tests
- [ ] **PromptPay trust model:** payment is buyer-self-confirmed (no webhook).
      Add slip verification (e.g. SlipOK) or a real gateway before scale.
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
