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

## How it works

1. **Sign up** — creates a real Supabase auth user + profile (display name,
   PromptPay ID, province). New accounts are auto-confirmed for the pilot.
2. **List a plant** — upload photos (Supabase Storage), pick a species, set a
   price. A unique **provenance QR** is generated for the plant tag.
3. **Buy** — checkout renders a real PromptPay QR for the exact amount, payable
   to the seller. Confirming creates an escrow-protected order.
4. **Track** — orders move through paid → shipped → delivered → completed.

The rich market price-history and trend analytics are seeded demo data so the
marketplace looks alive while you onboard real nurseries.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # type-check + production build
```

Supabase credentials ship with safe public defaults (see `.env.example`); access
is gated by Row Level Security. Override via env vars if you fork the backend.

## Database

Schema lives in Supabase (tables: `profiles`, `listings`, `transactions`,
`messages`, `watchlist`) with RLS policies and a `listing-photos` storage bucket.
A trigger auto-creates a profile on signup.
