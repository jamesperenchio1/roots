/** Platform economics configuration.
 *  Keep the fee in one place so it never gets hard-coded in UI components.
 *  Default is 0% during the pilot; override via NEXT_PUBLIC_PLATFORM_FEE_PERCENT.
 */
export const PLATFORM_FEE_PERCENT = (() => {
  const raw = process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT;
  if (raw === undefined || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
})();

export function calculatePlatformFees(salePriceThb: number) {
  const fee = Math.round((salePriceThb * PLATFORM_FEE_PERCENT) / 100);
  return {
    platformFeeThb: fee,
    sellerPayoutThb: Math.max(0, salePriceThb - fee),
  };
}
