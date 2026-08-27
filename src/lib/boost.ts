/**
 * Boost v1 — paid listing visibility (platform ad revenue, separate from
 * marketplace transactions). A fixed, discrete set of budget tiers, not a
 * continuous formula — keeps v1 simple and predictable to reason about on
 * both sides of the wire.
 *
 * This module is the single source of truth for the tier list. It is
 * imported both by the frontend (BoostModal) and, via a relative path, by
 * the `stripe-boost-checkout` Deno edge function — the backend must
 * validate any client-supplied tier against this exact list rather than
 * trusting a client-supplied amount/duration pair (prevents a manipulated
 * client request from buying a 7-day boost for ฿1). Keep this file free of
 * any imports so it stays loadable from both the Next.js bundler and Deno.
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
