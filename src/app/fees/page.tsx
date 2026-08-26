import type { Metadata } from 'next';
import FeesPage from '@/page-components/FeesPage';
import { PLATFORM_FEE_PERCENT } from '@/lib/platform-config';

export const metadata: Metadata = {
  title: 'Fees',
  description: PLATFORM_FEE_PERCENT === 0
    ? 'No platform fee during the pilot — no listing fees, no subscriptions, no hidden charges. Free for buyers.'
    : `Roots charges a ${PLATFORM_FEE_PERCENT}% platform fee per sale — no listing fees, no subscriptions, no hidden charges. Free for buyers.`,
};

export default function Page() {
  return <FeesPage />;
}
