/**
 * Boost v1 — paid listing visibility (platform ad revenue, separate from
 * marketplace transactions). A fixed, discrete set of budget tiers, not a
 * continuous formula — keeps v1 simple and predictable to reason about on
 * both sides of the wire.
 *
 * This is the CANONICAL, backend-side copy of the tier list, imported by
 * `stripe-boost-checkout` and any other edge function that needs to
 * validate a boost purchase. It follows this repo's convention of shared
 * Deno code living in `supabase/functions/_shared/` (see `auth.ts`,
 * `cors.ts`, `stripe.ts` in this directory) rather than reaching across
 * the `supabase/functions` boundary into the Next.js `src/` tree, which
 * has no precedent elsewhere in this codebase and is fragile against a
 * deploy pipeline that only ships `supabase/functions/**`.
 *
 * The frontend keeps its own copy at `src/lib/boost.ts` (Next.js code
 * cannot import from `supabase/functions/`, which is excluded from the
 * app's TypeScript/bundler project). The two files must stay numerically
 * identical — `src/lib/boost.test.ts` asserts this by importing both
 * modules and comparing `BOOST_TIERS` deeply, so any drift fails CI.
 * If you change the tiers, update BOTH files.
 */

export interface BoostTier {
  amountThb: number;
  hours: number;
  label: string;
}

export const BOOST_TIERS: BoostTier[] = [
  { amountThb: 99, hours: 24, label: '24 hours' },
  { amountThb: 199, hours: 72, label: '3 days' },
  { amountThb: 399, hours: 168, label: '7 days' },
];

/** Find a tier by its index into BOOST_TIERS, or undefined if out of range. */
export function getBoostTier(tierIndex: number): BoostTier | undefined {
  return BOOST_TIERS[tierIndex];
}

/**
 * Validate a client-supplied (amountThb, hours) pair against BOOST_TIERS.
 * Returns the matching tier only if both fields are an exact match to one
 * of the known tiers — used server-side to reject a tampered request.
 */
export function findMatchingBoostTier(amountThb: number, hours: number): BoostTier | undefined {
  return BOOST_TIERS.find((tier) => tier.amountThb === amountThb && tier.hours === hours);
}
