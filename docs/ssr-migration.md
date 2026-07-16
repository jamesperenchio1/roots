# SSR Migration: Vite SPA → Next.js 15 App Router

> Hand this document to Kimi. It is self-contained — Kimi needs no further context from the developer.

---

## 1. What this repo is

**Roots** is a Thai plant-trading marketplace. Sellers list plants, buyers pay via PromptPay QR, and the site mediates shipping + escrow. It is currently a Vite + React 19 SPA deployed as static files on Vercel, backed by Supabase (PostgreSQL + Storage + Auth + Realtime).

**Goal of this migration:** Add SSR so that public listing pages, seller profiles, and species pages are visible to search engines and generate correct Open Graph previews when shared in LINE and Facebook groups.

---

## 2. Current stack (what exists today)

| Layer | Technology |
|---|---|
| Framework | Vite 7 + React 19 + TypeScript |
| Router | `react-router-dom` v7 — `HashRouter` (routes in `src/App.tsx`) |
| Data fetching | TanStack Query v5 — all client-side |
| Auth | Supabase Auth, fully client-side, session stored in cookies via a custom `cookieStorage` adapter (`src/lib/cookieStorage.ts`) |
| Database | Supabase (project `daacilgagkphafpjdcte`, region `ap-southeast-1`) |
| UI | Tailwind CSS 3 + shadcn/ui + Radix UI |
| i18n | `i18next` + `react-i18next` — Thai and English, lazy-loaded, browser language detection |
| PWA | `vite-plugin-pwa` + Workbox |
| Monitoring | `@sentry/react` |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` |
| Hosting | Vercel — static SPA, push-to-main auto-deploys |

### Environment variables (current names — all prefixed `VITE_`)

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
VITE_APP_VERSION
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## 3. Target stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** App Router (`src/app/`) |
| Router | Next.js file-system router |
| Data fetching | TanStack Query v5 — server prefetch for public pages, client-side for authenticated pages |
| Auth | `@supabase/ssr` — cookie-based, server+browser client split, middleware session refresh |
| All other layers | Keep exactly as-is (Tailwind, shadcn, Radix, i18n, Sentry, Upstash) |

---

## 4. Package changes

### Remove
```
vite
@vitejs/plugin-react
vite-plugin-pwa
@sentry/vite-plugin
```

### Add
```
next                          # ^15.x
@supabase/ssr                 # cookie-based Supabase auth for Next.js
@sentry/nextjs                # replaces @sentry/react for Next.js
```

### Keep unchanged
Everything else in `package.json` stays. The `@supabase/supabase-js` version stays at `^2.107.0`.

### Rename env vars
Every `VITE_` prefix becomes `NEXT_PUBLIC_` for client-exposed vars. Server-only vars (Upstash, Sentry auth token) need no prefix.

```
VITE_SUPABASE_URL         → NEXT_PUBLIC_SUPABASE_URL
VITE_SUPABASE_ANON_KEY    → NEXT_PUBLIC_SUPABASE_ANON_KEY
VITE_SENTRY_DSN           → NEXT_PUBLIC_SENTRY_DSN
VITE_APP_VERSION          → NEXT_PUBLIC_APP_VERSION
SENTRY_AUTH_TOKEN         → SENTRY_AUTH_TOKEN  (unchanged)
SENTRY_ORG                → SENTRY_ORG         (unchanged)
SENTRY_PROJECT            → SENTRY_PROJECT     (unchanged)
UPSTASH_REDIS_REST_URL    → UPSTASH_REDIS_REST_URL   (unchanged)
UPSTASH_REDIS_REST_TOKEN  → UPSTASH_REDIS_REST_TOKEN (unchanged)
```

Update every `import.meta.env.VITE_*` reference in source files to `process.env.NEXT_PUBLIC_*`.

---

## 5. File / directory structure

Keep all existing files under `src/`. Add the `src/app/` directory alongside the existing `src/components/`, `src/pages/`, `src/lib/`, etc.

```
src/
  app/                          ← NEW — Next.js App Router
    layout.tsx                  ← root layout (Providers, Navbar, Footer)
    page.tsx                    ← HomePage
    not-found.tsx               ← NotFoundPage
    browse/
      page.tsx
      [category]/
        page.tsx
    market/
      page.tsx
    listing/
      [id]/
        page.tsx
        edit/
          page.tsx              ← protected (OwnershipGuard → middleware)
    species/
      [id]/
        page.tsx
    p/
      [plantId]/
        page.tsx                ← PlantQRPage
    seller/
      [id]/
        page.tsx
    about/page.tsx
    terms/page.tsx
    privacy/page.tsx
    contact/page.tsx
    how-it-works/page.tsx
    provenance/page.tsx
    fees/page.tsx
    shipping-guide/page.tsx
    scan/page.tsx
    identify/page.tsx
    login/page.tsx              ← PublicOnlyGuard → middleware
    signup/page.tsx             ← PublicOnlyGuard → middleware
    forgot-password/page.tsx
    reset-password/page.tsx
    dashboard/
      page.tsx                  ← protected
      [tab]/
        page.tsx                ← protected
    seller-dashboard/
      page.tsx                  ← protected (SellerGuard)
      [tab]/
        page.tsx
      listings/
        new/
          page.tsx
    messages/
      page.tsx                  ← protected
      [threadId]/
        page.tsx
    checkout/
      [listingId]/
        page.tsx                ← protected
    order/
      [transactionId]/
        page.tsx                ← protected
        dispute/
          page.tsx              ← protected
    admin/
      [[...slug]]/
        page.tsx                ← protected (AdminGuard)
  lib/
    supabase/
      server.ts                 ← NEW — server-side Supabase client
      client.ts                 ← NEW — browser Supabase client
    (all existing files stay unchanged)
  components/                   ← unchanged
  pages/                        ← keep existing page components (they become the inner content)
  hooks/                        ← unchanged
  types/                        ← unchanged
  i18n/                         ← unchanged
  data/                         ← unchanged
middleware.ts                   ← NEW — session refresh + route protection
next.config.ts                  ← NEW — replaces vite.config.ts
instrumentation.ts              ← NEW — Sentry server instrumentation
sentry.client.config.ts         ← NEW — Sentry browser config
```

Delete: `vite.config.ts`, `index.html`, `src/main.tsx`.

---

## 6. Supabase client split

### `src/lib/supabase/server.ts`
Used in Server Components, Route Handlers, and `middleware.ts`. Reads/writes cookies via `next/headers`.

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie setting is a no-op; middleware handles it
          }
        },
      },
    }
  );
}
```

### `src/lib/supabase/client.ts`
Used in Client Components. Creates a singleton browser client.

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Migration of existing imports
- Replace all `import { supabase } from '@/lib/supabase'` in **client components** with `createSupabaseBrowserClient()`.
- In **server components / route handlers**, use `createSupabaseServerClient()`.
- Delete `src/lib/supabase.ts` and `src/lib/cookieStorage.ts` after migrating all consumers.

---

## 7. Middleware (`middleware.ts` at repo root)

This does two jobs: (1) refreshes the Supabase session cookie on every request, (2) redirects unauthenticated users away from protected routes and authenticated users away from auth-only routes.

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/seller-dashboard',
  '/messages',
  '/checkout',
  '/order',
  '/admin',
];

const AUTH_ONLY_ROUTES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthOnly = AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthOnly && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
```

**Note on guards:** `AuthGuard`, `AdminGuard`, `SellerGuard`, `OwnershipGuard`, `PublicOnlyGuard` remain as client components for in-page use, but the primary redirect enforcement moves to middleware. Admin and seller role checks still happen client-side (the middleware only checks auth); those guard components stay.

---

## 8. Root layout (`src/app/layout.tsx`)

```tsx
'use client' // Only the Providers wrapper needs this; the layout shell itself can stay server

import type { Metadata } from 'next';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';
import TutorialModal from '@/components/TutorialModal';
import '@/index.css';
import '@/i18n/config';

export const metadata: Metadata = {
  title: { default: 'Roots — Thai Plant Marketplace', template: '%s | Roots' },
  description: 'Buy and sell rare plants in Thailand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <Navbar />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <Toaster />
          <ScrollToTop />
          <PwaUpdatePrompt />
        </Providers>
      </body>
    </html>
  );
}
```

### `src/app/providers.tsx` (client component)

```tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## 9. Auth provider update (`src/hooks/useAuth.tsx`)

The existing `AuthProvider` uses `import { supabase } from '@/lib/supabase'`. Replace that import with `createSupabaseBrowserClient()` from `@/lib/supabase/client`. Everything else in `useAuth.tsx` stays the same — it already manages sessions reactively via `onAuthStateChange`.

Add `'use client'` at the top of `useAuth.tsx`.

---

## 10. Page rendering strategy

### SSR pages — render server-side, pass data to client component via props

For each of these pages, the `src/app/.../page.tsx` is a **Server Component** that:
1. Calls `createSupabaseServerClient()` and queries the row
2. Uses `prefetchQuery` to populate the query cache
3. Returns `<HydrationBoundary>` wrapping the existing page component (moved to client component)
4. Exports `generateMetadata()` for SEO

| Route | File | Revalidation |
|---|---|---|
| `/listing/[id]` | `src/app/listing/[id]/page.tsx` | `revalidate = 60` (ISR) |
| `/seller/[id]` | `src/app/seller/[id]/page.tsx` | `revalidate = 120` |
| `/species/[id]` | `src/app/species/[id]/page.tsx` | `revalidate = 300` |
| `/browse` | `src/app/browse/page.tsx` | `revalidate = 30` |
| `/` | `src/app/page.tsx` | `revalidate = 60` |
| `/market` | `src/app/market/page.tsx` | `revalidate = 30` |

**Example pattern for `/listing/[id]`:**

```tsx
// src/app/listing/[id]/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicKeys } from '@/lib/queryKeys';
import ListingPage from '@/pages/ListingPage';
import type { Metadata } from 'next';

export const revalidate = 60;

async function fetchListing(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('listings')
    .select('*, profiles(*), species(*)')
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) return { title: 'Listing not found' };
  return {
    title: listing.title,
    description: listing.description ?? `${listing.title} for sale on Roots`,
    openGraph: {
      title: listing.title,
      description: listing.description ?? '',
      images: listing.photos?.[0] ? [{ url: listing.photos[0] }] : [],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: publicKeys.listing(id),
    queryFn: () => fetchListing(id),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListingPage />
    </HydrationBoundary>
  );
}
```

Add `'use client'` to the top of the existing `src/pages/ListingPage.tsx` (and any other page component that uses hooks).

### Static pages (no data)

`about`, `terms`, `privacy`, `contact`, `how-it-works`, `fees`, `shipping-guide`, `provenance` — each `page.tsx` simply re-exports the existing component:

```tsx
import AboutPage from '@/pages/AboutPage';
export default function Page() { return <AboutPage />; }
```

### Client-only pages (authenticated)

`dashboard`, `seller-dashboard`, `messages`, `checkout`, `order`, `admin` — these pages render client-side. The `page.tsx` wraps the existing component in `'use client'` and keeps the existing Guard:

```tsx
// src/app/dashboard/page.tsx
import AuthGuard from '@/components/AuthGuard';
import DashboardPage from '@/pages/DashboardPage';
export default function Page() {
  return <AuthGuard><DashboardPage /></AuthGuard>;
}
```

### Auth pages

```tsx
// src/app/login/page.tsx
import PublicOnlyGuard from '@/components/PublicOnlyGuard';
import LoginPage from '@/pages/LoginPage';
export default function Page() {
  return <PublicOnlyGuard><LoginPage /></PublicOnlyGuard>;
}
```

---

## 11. `generateMetadata` for all SSR pages

| Page | Title | Description | OG image |
|---|---|---|---|
| `/listing/[id]` | `listing.title` | `listing.description` | `listing.photos[0]` |
| `/seller/[id]` | `profile.display_name + "'s Shop"` | `"Plants by " + display_name` | `profile.avatar_url` |
| `/species/[id]` | `species.common_name_en \|\| species.scientific_name` | Species description | `species.image_url` |
| `/browse` | `"Browse Plants"` | `"Find rare plants for sale in Thailand"` | — |
| `/` | `"Roots — Thai Plant Marketplace"` | site tagline | — |

---

## 12. `next.config.ts`

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'daacilgagkphafpjdcte.supabase.co' },
      { protocol: 'https', hostname: 'api.gbif.org' },
      { protocol: 'https', hostname: 'api.inaturalist.org' },
      { protocol: 'https', hostname: 'static.inaturalist.org' },
      { protocol: 'https', hostname: 'inaturalist-open-data.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev; tighten in prod
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://daacilgagkphafpjdcte.supabase.co https://api.gbif.org https://api.inaturalist.org https://static.inaturalist.org https://inaturalist-open-data.s3.amazonaws.com https://en.wikipedia.org https://*.wikipedia.org https://upload.wikimedia.org https://*.tile.openstreetmap.org",
              "connect-src 'self' https://daacilgagkphafpjdcte.supabase.co wss://daacilgagkphafpjdcte.supabase.co https://perenual.com https://geocoding-api.open-meteo.com https://api.open-meteo.com https://my-api.plantnet.org https://api.gbif.org https://api.inaturalist.org https://en.wikipedia.org https://*.wikipedia.org https://nominatim.openstreetmap.org",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default config;
```

---

## 13. Browser-only libraries — require `dynamic()` or guards

These packages use browser APIs and will crash during SSR if imported at the module level:

| Library / file | Used in | Fix |
|---|---|---|
| `src/lib/promptpay.ts` | `CheckoutPage` | Already in a client-only page — add `'use client'` to the page component; no other change needed |
| `qrcode` | QR display components | Wrap in `dynamic(() => import('...'), { ssr: false })` |
| `html5-qrcode` | `QRScannerPage` | Wrap in `dynamic(() => import('...'), { ssr: false })` |
| `leaflet` | Map components | Wrap in `dynamic(() => import('...'), { ssr: false })` |
| `@emoji-mart/react` | Emoji picker | Wrap in `dynamic(() => import('...'), { ssr: false })` |
| `window` / `document` direct access | Any component | Guard with `typeof window !== 'undefined'` or move into `useEffect` |

Scan for `document.cookie`, `window.location`, `localStorage`, `sessionStorage` — all need `useEffect` or `'use client'` guards.

---

## 14. i18n in Next.js App Router

`i18next` with `react-i18next` works in client components unchanged. The `src/i18n/config.ts` init call stays — import it in the root layout:

```ts
// src/app/layout.tsx
import '@/i18n/config';
```

The `LanguageDetector` plugin uses `navigator.language` (browser-only). It will silently skip detection on the server and fall back to `en`, which is correct. No change needed.

For server components that need translated strings, use the `i18next` instance directly (`i18n.t(...)`) after calling `await i18n.changeLanguage(detectedLang)` — but this is optional; the primary i18n surface is client-side.

---

## 15. Sentry migration

Replace `@sentry/react` with `@sentry/nextjs`.

Create `instrumentation.ts` at the repo root:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

Create `sentry.client.config.ts` with the existing Sentry init config from `src/main.tsx`.
Create `sentry.server.config.ts` with the DSN + release only (no browser integrations).

Add to `next.config.ts`:
```ts
import { withSentryConfig } from '@sentry/nextjs';
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: { disable: false },
});
```

---

## 16. PWA

`vite-plugin-pwa` is removed. Add `next-pwa` if you want to keep PWA behavior:

```
npm install next-pwa
```

Wrap `next.config.ts` export with `withPWA({ dest: 'public', register: true, skipWaiting: true })`.

The Workbox `navigateFallback: 'index.html'` rule is SPA-only and must be removed — Next.js handles navigation server-side.

If PWA is not a priority for the initial migration, skip it and add it as a follow-up.

---

## 17. `vercel.json`

The existing `vercel.json` only contains security headers. Those headers move to `next.config.ts` (see section 12). Delete `vercel.json` entirely — it is not needed for a Next.js project on Vercel.

---

## 18. TanStack Query — queryClient singleton

The existing `src/lib/queryClient.ts` creates a module-level singleton. In Next.js App Router, each request must get its own `QueryClient` on the server; the singleton is only valid for the browser.

**Server-side (in server component pages):** `const queryClient = new QueryClient()` inside the component function — create fresh per request, use for prefetch, then dehydrate.

**Browser-side:** Keep the existing singleton from `src/lib/queryClient.ts` — pass it to `<QueryClientProvider>` in `src/app/providers.tsx`.

---

## 19. `useMarketOverview` BootGate

The existing `App.tsx` wraps everything in a `BootGate` that blocks render until `useMarketOverview` resolves. In Next.js this isn't needed for SSR pages — the server fetches data synchronously. Remove `BootGate` from the layout. If individual pages need a loading state while client-side data loads, use `Suspense` or the query's `isPending` state locally within the page component.

---

## 20. Route changes to communicate to users / links

`HashRouter` used `/#/listing/123` style URLs. `BrowserRouter` (and Next.js) uses `/listing/123`. Any hardcoded hash-prefixed links (`/#/`) in components must be updated to `/`. Search for `/#/` across all files.

Also search for `useNavigate`, `Link to=`, `href=` with hash-prefixed paths.

---

## 21. `scripts/seed-database.cjs`

This is a Node.js script, not part of the app bundle. No changes needed.

---

## 22. Things to leave completely unchanged

- All files under `src/components/` — they become client components via `'use client'` if they use hooks, otherwise they work as-is
- All files under `src/pages/` — add `'use client'` at the top of each file; the page components themselves don't change
- `src/types/index.ts` — unchanged
- `src/data/` — unchanged
- `src/lib/api.ts`, `src/lib/messaging.ts`, `src/lib/validation.ts`, `src/lib/utils.ts`, etc. — unchanged (they're just functions)
- `src/hooks/queries/*` — unchanged; add `'use client'` if any hook uses React context
- `src/i18n/` — unchanged
- `supabase/` (migrations directory) — unchanged
- `tailwind.config.js`, `postcss.config.js`, `components.json` — unchanged
- `tsconfig.json` — add `"plugins": [{ "name": "next" }]` and ensure `moduleResolution: "bundler"`

---

## 23. Implementation order

Work in this order to keep the app functional at each step:

1. Install Next.js, `@supabase/ssr`, `@sentry/nextjs`. Remove Vite packages.
2. Create `next.config.ts`, delete `vite.config.ts` and `index.html`.
3. Update `tsconfig.json` for Next.js.
4. Rename env vars throughout source files.
5. Create `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`. Migrate `useAuth.tsx` to browser client.
6. Create `middleware.ts`.
7. Create `src/app/layout.tsx` and `src/app/providers.tsx`.
8. Add `'use client'` to every file in `src/pages/` and `src/hooks/`.
9. Create client-passthrough `page.tsx` files for all routes (just re-export the existing page component). This gets the app running in Next.js before any SSR optimization.
10. Verify the app runs and all routes work.
11. Add SSR with `prefetchQuery` + `dehydrate` + `HydrationBoundary` to the six SSR-target pages.
12. Add `generateMetadata()` to SSR pages.
13. Wrap browser-only libraries in `dynamic()`.
14. Remove `BootGate` from layout.
15. Migrate Sentry.
16. Delete `vercel.json`.
17. Final pass: search for `import.meta.env`, `/#/`, `HashRouter`, `cookieStorage`, `VITE_` — remove all.
