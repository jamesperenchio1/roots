/** Platform economics configuration.
 *  Keep the fee in one place so it never gets hard-coded in UI components.
 *  Root charges no marketplace fees, ever — buyer pays 100%, seller keeps
 *  100%. This is a fixed product decision, not a configurable dial.
 */
export const PLATFORM_FEE_PERCENT = 0;

/** Marketplace-checkout Stripe (custodial) payment path, gated separately
 *  from whether Stripe API keys happen to be configured — defaults off so
 *  ops can flip it on deliberately later without further code changes.
 *  Explicit opt-in string comparison: false unless the env var is the
 *  literal string 'true'.
 */
export const STRIPE_CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true';

export function calculatePlatformFees(salePriceThb: number) {
  const fee = Math.round((salePriceThb * PLATFORM_FEE_PERCENT) / 100);
  return {
    platformFeeThb: fee,
    sellerPayoutThb: Math.max(0, salePriceThb - fee),
  };
}
