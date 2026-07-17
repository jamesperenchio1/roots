import type { Metadata } from 'next';
import PrivacyPage from '@/page-components/PrivacyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Roots collects, uses, and protects your personal data on the Thai plant marketplace.',
};

export default function Page() {
  return <PrivacyPage />;
}
