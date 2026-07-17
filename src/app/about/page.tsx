import type { Metadata } from 'next';
import AboutPage from '@/page-components/AboutPage';

export const metadata: Metadata = {
  title: 'About Roots',
  description: 'Learn about Roots — Thailand\'s trusted marketplace for rare and exotic plants, built on transparency and provenance.',
};

export default function Page() {
  return <AboutPage />;
}
