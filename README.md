# Root — Thailand's Plant Marketplace 🌿

A marketplace for trading plants (herbs to rare aroids) with permanent QR
provenance, transparent price history, and PromptPay payments. Built for Thai
nurseries and collectors.

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind + shadcn/ui (HashRouter SPA)
- **Backend:** Supabase (Postgres + Auth + Storage + Row Level Security) — free tier
- **Payments:** Dynamic **PromptPay** QR generated client-side (EMVCo standard).
  Any Thai banking app scans it and pays the seller directly. No gateway or
  business registration required. A payment gateway can be added later.
- **Testing:** Vitest + jsdom + @testing-library/react

## How it works

1. **Sign up** — creates a real Supabase auth user + profile (display name,
   PromptPay ID, province). New accounts are auto-confirmed for the pilot.
2. **List a plant** — upload photos (Supabase Storage), pick a species, set a
   price. A unique **provenance QR** is generated for the plant tag.
3. **Buy** — checkout renders a real PromptPay QR for the exact amount, payable
   to the seller. Confirming creates an escrow-protected order.
4. **Track** — orders move through paid → shipped → delivered → completed.

The catalog, sellers, orders, reviews and market analytics are all backed by
real Supabase data — the app ships with no seeded demo listings, so it shows
only genuine activity. A curated species taxonomy (names, care info, reference
photos) is retained to power search, autocomplete and listing creation.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # type-check + production build
npm run test     # run tests
npm run test:ui  # interactive test UI
```

Supabase credentials ship with safe public defaults (see `.env.example`); access
is gated by Row Level Security. Override via env vars if you fork the backend.

## Database

Schema lives in Supabase (tables: `profiles`, `listings`, `transactions`,
`messages`, `watchlist`) with RLS policies and a `listing-photos` storage bucket.
A trigger auto-creates a profile on signup.

## Production checklist

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- [ ] Create storage buckets: `listing-photos`, `order-photos`, `dispute-evidence` (public, 5MB limit)
- [ ] Enable RLS on all tables with appropriate policies
- [ ] Configure Supabase auth email templates
- [ ] Set up a custom domain for the deployed app
- [ ] Configure CORS on Supabase Storage
- [ ] Add Sentry or similar for error tracking (wire into `src/lib/logger.ts`)
- [ ] Review and tighten `updateProfile` RLS policy
- [ ] Enable email verification if moving out of pilot mode

## Architecture decisions

- **HashRouter** used for static hosting compatibility (GitHub Pages, Netlify, etc.)
- **Client-side PromptPay** keeps us free-tier; no payment gateway needed
- **Live Supabase data only** — real profiles, listings and orders hydrate the in-memory stores at boot; no fabricated listings are shown
- **Code splitting** via manual chunks keeps initial JS under 900KB
