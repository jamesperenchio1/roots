import type { Metadata } from 'next';
import TermsPage from '@/page-components/TermsPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the Roots terms of service — the rules for buying and selling plants on the platform.',
};

export default function Page() {
  return <TermsPage />;
}
