# Production Readiness Report — Root Plant Market

**Date:** 2026-06-28
**Commit:** `d294a8e` on `main`
**Score:** 88/100

---

## Summary

This release completes the v1.0 production-readiness push. The biggest gaps closed are **full Thai/English internationalisation**, a **type-safe seller dashboard redesign**, and **expanded test coverage** (unit + e2e). Build, lint, unit tests, and e2e tests are all green.

---

## What Was Improved in This Release

### Internationalisation (i18n) — Complete
- Added `i18next` + `react-i18next` + browser language detection.
- Created namespaces: `common`, `auth`, `marketplace`, `checkout`, `messages`, `dashboard`, `home`.
- Full English and Thai translations for every user-facing string.
- Added `LanguageSwitcher` component in the navbar; persists choice to `localStorage` and to the user profile when authenticated.
- All pages, components, error states, and empty states now use translation keys instead of hardcoded English.
- Added `scripts/extract-i18n-keys.cjs` to detect missing keys; current run reports **0 missing**.

### Seller Dashboard Redesign
- Rebuilt `SellerDashboardPage.tsx` from the ground up with correct imports/types.
- Tabs: Listings, Orders, Offers, Payouts, Analytics, Performance, Inventory, QR Management, Reviews, Account.
- Real-time hooks: hydrates transactions and offers when tabs are active; subscribes to Supabase changes.
- Listing actions: view, edit, duplicate, withdraw, print QR, boost placeholder.
- Order lifecycle: status filter, timeline visualisation, confirm payment, mark shipped via modal, view slip.
- Payouts: available balance, paid-out totals, fee breakdown, expandable payout history.
- Analytics: views, watches, conversion rate, sales-by-category, popular listings sparklines.
- Performance: seller score, monthly trend chart, top buyers.
- Account tab: PromptPay ID and province settings persisted via `updateProfile`.

### Testing
- **Unit tests:** 40 passing across validation, PromptPay, hooks, components, and the new `SellerDashboardPage.test.tsx`.
- **E2E tests:** 7 passing with Playwright covering homepage navigation, auth pages, and seller-dashboard auth-guard redirect.
- Added i18n initialisation to `src/test/setup.ts` so component tests render translated strings correctly.

### Error Handling & Shared Components
- `ErrorBoundary` converted to a named HOC with `withTranslation('common')`; fallback UI is now translatable.
- `AuthGuard` loading state is now translatable.

### Build & Tooling
- `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e` all pass.
- Added `.playwright-mcp/` to `.gitignore`.

---

## Current State

| Category | Score | Notes |
|----------|-------|-------|
| Functionality | 88 | Core flows work end-to-end; dashboard and i18n now complete. Real-time messaging and card payments still absent. |
| Security | 78 | Input sanitization, validation, RLS assumed; admin local bypass still present. |
| Reliability | 86 | Error boundaries, polling, realtime subscriptions for listings/offers/transactions, offline fallback. |
| UX | 92 | Pagination, skeletons, empty states, loading states, error messages, language switcher. |
| Performance | 74 | Code-splitting for vendors/pages; main JS chunk is 563 KB / 168 KB gzip — acceptable for a feature-rich SPA but still optimisable. |
| Testing | 82 | 40 unit tests + 7 e2e tests; more journey coverage possible. |
| Monitoring | 62 | Logger utility exists; not wired to a remote service. |
| Documentation | 86 | README updated previously; this report refreshed. |

**Overall Score: 88/100** (up from 82/100)

---

## What Still Remains

### P1 — Should Fix Before Major Traffic

| Issue | Risk | Effort |
|-------|------|--------|
| **No real messaging system** | Buyers cannot actually chat with sellers in real time | Medium |
| **No email backend for contact form** | Messages go nowhere; need Supabase Edge Function or email service | Low |
| **Card payments are placeholder** | Checkout has a non-functional card tab; only PromptPay works | Medium |
| **No image optimisation** | Full-size images loaded everywhere; need responsive srcset or CDN transform | Medium |
| **Mock data mixed with live data** | Seed data never purges; could confuse users if stale | Low |
| **Admin is local-only** | `loginAsLocalAdmin` is a dev bypass; no server-side admin panel | Medium |

### P2 — Nice to Have

| Issue | Risk | Effort |
|-------|------|--------|
| **Bundle could be smaller** | Main chunk 563 KB; further code-splitting and lazy loading possible | Medium |
| **No analytics** | No Mixpanel, Amplitude, or Google Analytics | Low |
| **No error tracking service wired** | Logger has a hook for Sentry/LogRocket but is not connected | Low |
| **E2E coverage limited** | No full happy-path test: signup → list → browse → checkout → ship → confirm | Medium |

---

## Known Risks

1. **Supabase RLS policies** — The app assumes RLS is properly configured. If policies are too permissive, the anon key exposes data. If too restrictive, features break.
2. **Storage bucket permissions** — `listing-photos`, `order-photos`, and `dispute-evidence` buckets must be created with public read policies.
3. **PromptPay trust model** — Buyer manually confirms payment after scanning QR. No webhook confirmation, so bad actors could click "I've paid" without paying.
4. **Auto-confirm signup** — Pilot auto-confirms accounts. In production, require email verification.
5. **Local admin bypass** — `loginAsLocalAdmin()` is accessible on the login page. Hide behind dev-only flags before public launch.

---

## Recommended Next Steps

### Immediate (next 2 weeks)
1. Set up Supabase storage buckets with proper policies.
2. Write RLS policy tests for `profiles`, `listings`, `transactions`, `disputes`.
3. Add a full Playwright happy-path test: signup → list → browse → checkout → mark shipped → confirm receipt.
4. Integrate Sentry for error tracking (wire into `logger.ts`).
5. Add Cloudflare/ImageKit responsive image transforms.

### Short-term (next month)
1. Implement real messaging via Supabase realtime.
2. Add card payments via Omise/Stripe.
3. Build a proper server-side admin panel or lock down the local bypass.

### Long-term (next quarter)
1. Push notifications for order updates.
2. iOS/Android app via Capacitor.
