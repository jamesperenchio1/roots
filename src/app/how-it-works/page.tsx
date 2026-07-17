import type { Metadata } from 'next';
import HowItWorksPage from '@/page-components/HowItWorksPage';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Discover how Roots makes buying and selling rare plants in Thailand safe, simple, and transparent — from listing to delivery.',
};

export default function Page() {
  return <HowItWorksPage />;
}
