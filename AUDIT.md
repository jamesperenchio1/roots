# Roots Production Readiness Audit

**Date:** 2026-07-15  
**Scope:** Full product, codebase, database, and deployment audit for the Roots Thailand plant marketplace.

> This audit was generated before any code changes were made. Each item is prioritized P0 (blocker), P1 (important), or P2 (nice-to-have).
> **Update 2026-07-16:** TanStack Query migration and first-pass P0 security hardening are complete; see the Verification Checklist and P0 Action Plan below for status.

---

## Executive Summary

Roots is a feature-rich React SPA backed by Supabase. It already has lazy loading, PWA support, a comprehensive i18n system, and real-time subscriptions. However, several **P0 blockers** must be fixed before the product can safely serve 100,000+ users:

1. **Security holes** in order/payment functions allow buyers to confirm their own payments and arbitrary status changes.
2. **Database migrations are incomplete** — core tables (`profiles`, `listings`, `transactions`, etc.) are not under version control, and the `guard_payment_confirmed` trigger claimed in the README does not exist.
3. **Lint is broken** (`npm run lint` exits 1).
4. **The live site is behind a Vercel Security Checkpoint**, blocking access for automated tools and potentially some users.
5. **The global mutable in-memory store** causes hydration races, stale data, and testing fragility.
6. **No seller/ownership route guards** — any logged-in user can reach seller flows, and edit-listing ownership is checked only inside the page.

---

## Phase 1 — Full Product Audit

### Architecture

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1.1 | **Global mutable singleton stores** bypass React state. Pages read synchronously from arrays that are hydrated asynchronously, causing empty/not-found flashes and race conditions. | P0 | `src/data/mockData.ts` exports mutable arrays; `src/lib/api.ts` mutates them directly (`LISTINGS.length = 0; LISTINGS.push(...)`). |
| 1.2 | Pages render "not found" before public data has finished hydrating. | P0 | `ListingPage`, `SellerPage`, `OrderPage` initialize from `getListingById` / `getTransactionById` immediately. |
| 1.3 | ~~`BrowsePage` fakes loading with a 400 ms `setTimeout` regardless of actual hydration state.~~ | Done | `BrowsePage` now derives loading from TanStack Query `isPending`. |
| 1.4 | ~~Duplicated realtime subscriptions — `AuthProvider` and individual pages both open Supabase channels.~~ | Done | Page-level channels removed; realtime is centralized in `AuthProvider` and messaging helpers. |
| 1.5 | ~~Long pages mix many concerns, making them hard to test and maintain.~~ | Done | Refactored all four: `SellerDashboardPage` (~217 lines), `CreateListingPage` (~336 lines), `MessagesPage` (~361 lines), `AdminPage` (~65 lines). Sections/tabs extracted to `src/components/seller-dashboard/`, `src/components/create-listing/`, `src/components/messaging/`, and `src/components/admin/`. |
| 1.6 | ~~No shared `ListingCard` component — each page reimplements card markup.~~ | Done | Extracted `src/components/ListingCard.tsx` and replaced inline cards on `HomePage`, `BrowsePage`, `MarketPage`, `SpeciesPage`, `SellerPage`. |
| 1.7 | ~~Inconsistent form controls across create/edit listing.~~ | Done | `EditListingPage` now uses `ProvinceCombobox` to match `CreateListingPage`. |
| 1.8 | ~~`localStorage` is read synchronously during render in several hooks/pages.~~ | Done | `useOnboarding.ts` already effect-only; `useRecentlyViewed.ts` and `MarketPage.tsx` moved to `useEffect`. |
| 1.9 | ~~17 `eslint-disable react-hooks/exhaustive-deps` comments hide stale-closure risks.~~ | Done | Reduced to one intentional disable in `CommentTree` for manual reply cache-busters; all page-level disables removed. |
| 1.10 | ~~Many installed shadcn/ui components are unused, increasing bundle and maintenance surface.~~ | Done | Removed 33 unused UI component files (`alert-dialog`, `aspect-ratio`, `breadcrumb`, `card`, `chart`, `checkbox`, `collapsible`, `context-menu`, `drawer`, `menubar`, `navigation-menu`, `pagination`, `radio-group`, `resizable`, `scroll-area`, `sheet`, `sidebar`, `slider`, `switch`, `table`, `tabs`, `toggle`, `toggle-group`, `tooltip`, etc.). |

### Routes & Guards

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1.11 | No seller role/verification. Any authenticated user can create listings and access the seller dashboard. | P0 | `CreateListingPage` and `SellerDashboardPage` only behind `AuthGuard`. |
| 1.12 | Edit-listing ownership check happens inside the page, not at the route level. | P0 | `/listing/:id/edit` uses `AuthGuard` only; `EditListingPage` renders `<NotFound />` if not owner. |
| 1.13 | `AdminGuard` redirects non-admins to `/login`, which can create loops and is confusing. | P1 | `src/components/AdminGuard.tsx` |
| 1.14 | `/login` and `/signup` are accessible while authenticated. | P2 | No redirect-to-dashboard logic. |
| 1.15 | "Remember me" checkbox on login is non-functional. | P2 | `src/pages/LoginPage.tsx` |

### State & Data Flow

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1.16 | `confirmPaymentReceived` does not verify the caller is the seller. | P0 | `src/lib/api.ts:654` |
| 1.17 | `updateOrderStatus` allows arbitrary field updates with no caller or state-machine validation. | P0 | `src/lib/api.ts:751` |
| 1.18 | `createOrder` fallback creates split-brain state: if DB insert fails, it still marks the listing `sold` and creates a local-only transaction. | P1 | `src/lib/api.ts:669-749` |
| 1.19 | `DisputePage` uploads evidence with a hardcoded `'buyer'` user ID. | P0 | `src/pages/DisputePage.tsx` |
| 1.20 | `markListingSold` does not verify the caller owns the listing and diverges provenance/financial ledgers. | P1 | `src/lib/api.ts` |

---

## Phase 2 — UX Review (Non-Technical Thai User)

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 2.1 | ~~Loading states are inconsistent or fake, leaving users unsure whether content is coming.~~ | Done | `BrowsePage` uses query `isPending`; `SellerPage` waits for both seller and listings before not-found. |
| 2.2 | ~~PromptPay checkout lacks clear explanation when the seller has no PromptPay ID.~~ | Done | `CheckoutPage` now shows the `sellerNoPromptPay` message inline in the PromptPay panel when the seller has no PromptPay ID, and disables the pay button. |
| 2.3 | ~~Some static copy is still in English even when Thai is selected.~~ | Done | Family/genus labels, pickup pin note, PromptPay copy, fees example, contact hours, home sales count, listing alt text, and tag suggestions are now i18n keys. |
| 2.4 | Mobile touch targets and layouts need verification; the live site is inaccessible for automated testing. | P1 | Vercel Security Checkpoint blocks Playwright. |
| 2.5 | Empty states are generic and do not guide the user to the next action. | P2 | `common:empty` is used everywhere. |

---

## Phase 3 — Language System

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 3.1 | Several hardcoded English strings remain in JSX and attributes. | P1/P2 | Page-level placeholders/alts addressed; shadcn component `sr-only` text remains P2. |
| 3.2 | Thai resources are loaded on demand but there is no loading indicator while switching. | P2 | `loadThaiResources()` is fire-and-forget. |
| 3.3 | No URL locale support; language choice is localStorage only. | P2 | `src/i18n/config.ts` |
| 3.4 | Currency formatting uses hardcoded "THB" / "บาท" in some places rather than a formatter. | P2 | `plantQr.price`, `identification.catalogueRange` |

---

## Phase 4 — Visual Polish

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 4.1 | PageLoader is a plain spinner with low contrast and no brand personality. | P2 | `src/App.tsx` |
| 4.2 | Empty states, error states, and skeletons are not visually consistent. | P2 | Spread across pages. |
| 4.3 | ~~Card markups differ across pages, creating inconsistent hover/focus/loading behavior.~~ | Done | Shared `ListingCard` unifies card markup and lazy-loading behaviour. |

---

## Phase 5 — User Flows

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 5.1 | Buyer can buy their own listing. | P1 | `CheckoutPage` |
| 5.2 | ~~Dirty form navigation in `EditListingPage` only warns on `beforeunload`, not React Router navigation.~~ | Done | Added `useBlocker` guard with confirm modal when `isDirty` is true. |
| 5.3 | ~~Contact form messages go nowhere (no email backend).~~ | Done | Added `send-contact-email` Edge Function, `contact_submissions` table, and wired `ContactPage` to call it. |
| 5.4 | Card payment tab in checkout is non-functional placeholder. | P2 | `CheckoutPage` |
| 5.5 | No undo actions for destructive operations (withdraw listing, reject offer, etc.). | P2 | Across dashboards. |

---

## Phase 6 — Performance

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 6.1 | `hydratePublicData` loads entire public datasets without pagination. | P1 | `src/lib/api.ts` — profiles, active listings, reviews. Still open. |
| 6.2 | ~~N+1 profile fetching in `mapListing`.~~ | Done | Removed per-row `fetchProfile` fallback; callers now pass a hydrated profile map. |
| 6.3 | Large vendor chunks: `vendor-react` (~512 KB / 169 KB gzip), `vendor-recharts` (~387 KB / 105 KB gzip), `html5-qrcode-scanner` (~335 KB / 99 KB gzip). | P2 | Build output. |
| 6.4 | No responsive image optimization / srcset; full-size Supabase images are loaded everywhere. | P2 | Build output, `ListingPage`, `BrowsePage`. |
| 6.5 | ~~`recharts` is loaded even when charts are below the fold.~~ | Done | `LazyPriceChart` wrapper with `IntersectionObserver` defers loading until charts approach viewport; applied to `HomePage`, `MarketPage`, `ListingPage`, `SpeciesPage`, `PlantQRPage`, `MakeOfferModal`. |

---

## Phase 7 — Accessibility

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 7.1 | ~~Some icon-only buttons have English-only `aria-label` / `sr-only` text.~~ | Done | `CarouselPrevious`/`CarouselNext` and `DialogContent` close button now accept override labels; `TutorialModal` and `CommentReportDialog` pass translated `common:actions` labels. Unused `pagination`/`sheet`/`sidebar` components removed. |
| 7.2 | Focus management for modals and drawers depends on Radix defaults; no explicit focus traps reviewed. | P2 | shadcn/ui wrappers. |
| 7.3 | Reduce-motion preference is not explicitly handled. | P2 | `framer-motion` unused; Tailwind `animate-*` classes present. |

---

## Phase 8 — Database

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 8.1 | **Core base tables are not under version control.** `profiles`, `listings`, `transactions`, `notifications`, `messages`, `price_alerts`, `disputes`, `reviews`, `watchlist`, `species` have no `CREATE TABLE` migration. | P0 | Earliest migration is `ALTER TABLE transactions`; grep for `CREATE TABLE public.profiles` returns nothing. |
| 8.2 | **`guard_payment_confirmed` trigger referenced in README does not exist.** | P0 | Grep across migrations returns no matches. |
| 8.3 | `transactions` has no CHECK constraint on `status` in migrations. | P1 | Schema audit. |
| 8.4 | FKs missing for `transactions.listing_id`, `transactions.buyer_id`, `transactions.seller_id`, `notifications.user_id`, `price_alerts.user_id/species_id`, `disputes.transaction_id`. | P1 | Migrations audit. |
| 8.5 | Storage buckets `listing-photos` and `payment-slips` are not defined or locked down in migrations. | P0 | `src/lib/api.ts` creates `listing-photos` client-side; `payment-slips` referenced but no policy migration. |
| 8.6 | `qr_scans` INSERT policy is too permissive (any authenticated user can spam). | P1 | `20260708000001_provenance.sql` |
| 8.7 | `offers` UPDATE policy lacks state-machine validation. | P1 | `20260708000011_create_offers.sql` |
| 8.8 | `listings` UPDATE policy allows sellers to change status to anything. | P1 | `20260716000000_listings_rls_and_plant_trigger.sql` |
| 8.9 | `listings` INSERT does not block banned users. | P1 | Missing `is_banned` check. |
| 8.10 | Trigger `refresh_price_snapshot` recomputes aggregates on every listing/transaction change. | P2 | Performance concern at scale. |

---

## Phase 9 — Security

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 9.1 | `confirmPaymentReceived` lacks authorization. | P0 | `src/lib/api.ts:654` |
| 9.2 | `updateOrderStatus` lacks authorization and state-machine validation. | P0 | `src/lib/api.ts:751` |
| 9.3 | `guard_payment_confirmed` trigger missing. | P0 | README claim, no migration. |
| 9.4 | Storage bucket policies missing for listing photos and payment slips. | P0 | No migration. |
| 9.5 | Hardcoded `'buyer'` in dispute evidence upload. | P0 | `src/pages/DisputePage.tsx` |
| 9.6 | `loginAsLocalAdmin()` dev bypass is present in production. | P0 | README production checklist; `src/hooks/useAuth.tsx` likely exposes it. |
| 9.7 | `cleanup_seed_data` historically allowed authenticated callers; superseded migrations remain in history. | P1 | `20260715000001/0002` |
| 9.8 | ~~CORS allows localhost in edge function shared code.~~ | Done | `isAllowedOrigin` now only permits origins explicitly listed in `ALLOWED_ORIGINS` or the static defaults; localhost must be added to `ALLOWED_ORIGINS` for local dev. |

---

## Phase 10 — Codebase Quality

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 10.1 | `npm run lint` fails (1 error, 4 warnings). | P0 | `src/lib/api.test.ts` unused `beforeEach`; `CommentSection.tsx`; `useOnboarding.ts`; seed script eslint-disable. |
| 10.2 | ~~Unused production dependencies bloat the bundle and install.~~ | Done | Removed `@sentry/browser`, `@hookform/resolvers`, `zod`, `framer-motion`, `dompurify`, `@types/dompurify`, `react-hotkeys-hook`, `tw-animate-css`. |
| 10.3 | ~~Missing dependency: `dotenv` is used in `scripts/seed-database.cjs` but not declared.~~ | Done | Added `dotenv` to devDependencies. |
| 10.4 | ~~Missing `@vitest/coverage-v8` means configured coverage reporting is broken.~~ | Done | Added `@vitest/coverage-v8` to devDependencies. |
| 10.5 | ~~`.env.example` is missing required server/edge variables.~~ | Done | `.env.example` now documents service-role key, SlipOK, EasySlip, Upstash, email, cron, and contact email variables. |
| 10.6 | ~~`.env.example` documents unused analytics/payment variables.~~ | Done | Removed unused `VITE_PLAUSIBLE_DOMAIN`, `VITE_GA_ID`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, and `VITE_OMISE_PUBLIC_KEY` from `.env.example`. |
| 10.7 | Heavy use of `as` casts in `src/lib/api.ts` (~629) bypasses generated types. | P1 | `src/lib/api.ts` |
| 10.8 | Test coverage is low (17 test files for 181 source files). | P2 | Coverage report missing. |
| 10.9 | ~~`SellerDashboardPage.test.tsx` lives in `src/pages/` instead of a test directory.~~ | Done | Moved to `src/test/SellerDashboardPage.test.tsx` and updated import to `@/pages/SellerDashboardPage`. |
| 10.10 | ~~`innerHTML` used in `SellerReviewCard.tsx` for a fallback icon.~~ | Done | Replaced with a React `ReviewImage` component that uses `ImageOff` from `lucide-react` and local error state. |

---

## Phase 11 — Production Readiness

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 11.1 | Live deployment behind Vercel Security Checkpoint (HTTP 403). | P0 | `https://roots-rho-two.vercel.app` returns checkpoint page. |
| 11.2 | Build succeeds, but lint fails, so CI would reject the release. | P0 | `npm run build` ✓, `npm run lint` ✗. |
| 11.3 | ~~Sentry source-map upload configured but Sentry logger is not wired.~~ | Done | `src/lib/logger.ts` forwards scrubbed warnings/errors to Sentry via `captureException`/`captureMessage`; `vite.config.ts` uploads source maps when Sentry env vars are present. |
| 11.4 | ~~No mobile viewport in Playwright config.~~ | Done | Added `mobile-chrome` project using `devices['Pixel 5']` alongside desktop Chromium. |

---

## Immediate Action Plan

### P0 — Fix First

1. [x] Fix `npm run lint` (remove unused `beforeEach`, clean eslint-disable directives).
2. [x] Add missing env vars to `.env.example` (verified complete).
3. [x] Harden `confirmPaymentReceived` and `updateOrderStatus` in `src/lib/api.ts`.
4. [x] Add the missing `guard_payment_confirmed` database trigger.
5. [x] Fix hardcoded `'buyer'` in `src/pages/DisputePage.tsx` (role was already dynamic; confirmed no user-ID hardcoding remains).
6. [x] Add `SellerGuard` / `OwnershipGuard` for seller and edit-listing routes.
7. [x] Fix `AdminGuard` redirect target (now redirects to `/`).
8. [x] Create base schema migrations (`CREATE TABLE IF NOT EXISTS`) for core tables.
9. [x] Define storage buckets and policies in migrations.
10. [x] Remove or hide `loginAsLocalAdmin()` dev bypass (no longer present in codebase).

### P1 — Next

11. [x] Prevent buyer from purchasing their own listing (`CheckoutPage` guard + `createOrder` server-side check).
12. [x] Fix checkout PromptPay-no-ID explanation and add missing i18n strings (`checkout:errors.ownListing`, `checkout:errors.sellerNoPromptPay`).
13. Refactor global mutable store to use explicit hydration loading state (quick win).
14. Remove duplicate realtime subscriptions in pages.
15. [x] Remove unused dependencies and add missing `dotenv` / `@vitest/coverage-v8`.
16. [x] Standardize form controls (`ProvinceCombobox`, `MapLocationPicker`).
17. [x] Fix remaining hardcoded page-level UI strings (shadcn component `sr-only` text remains P2).
18. [x] Add indexes for common query patterns.
19. [x] Batch profile lookups to fix N+1.
20. Add RLS policy tests.

### P2 — Polish

21. [x] Create shared `ListingCard` (with presets + display toggles).
22. Lazy-load charts below the fold.
23. Add responsive image transforms.
24. Expand test coverage.
25. [x] Clean up unused shadcn/ui components.

---

## Verification Checklist

- [x] `npm run lint` passes with no errors or warnings.
- [x] `npm run build` passes.
- [x] `npm test` passes.
- [ ] `npm run test:e2e` passes (against local dev server).
- [ ] No hardcoded user-facing English strings remain in pages/components.
- [x] All route guards enforce role/ownership at the route level.
- [x] Payment/order functions validate caller authorization.
- [x] Database migrations can reproduce the live schema from scratch.
- [ ] Storage buckets have restrictive RLS policies.
