import type { Metadata } from 'next';
import FeesPage from '@/page-components/FeesPage';

export const metadata: Metadata = {
  title: 'Fees',
  description: 'Roots charges an 8% platform fee per sale — no listing fees, no subscriptions, no hidden charges. Free for buyers.',
};

export default function Page() {
  return <FeesPage />;
}
