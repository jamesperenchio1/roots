/**
 * Boost v1 — paid listing visibility (platform ad revenue, separate from
 * marketplace transactions). A fixed, discrete set of budget tiers, not a
 * continuous formula — keeps v1 simple and predictable to reason about on
 * both sides of the wire.
 *
 * This is the FRONTEND copy of the tier list, used by `BoostModal` to
 * render the slider/summary. The canonical, backend-side copy lives at
 * `supabase/functions/_shared/boost.ts` and is what `stripe-boost-checkout`
 * actually validates against server-side — Next.js code cannot import
 * from `supabase/functions/`, so the two files are necessarily separate
 * copies. They must stay numerically identical; `src/lib/boost.test.ts`
 * enforces this by importing both modules and deep-comparing `BOOST_TIERS`,
 * so any drift between them fails the test suite. If you change the
 * tiers, update BOTH files.
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
