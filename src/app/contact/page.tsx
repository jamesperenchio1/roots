import type { Metadata } from 'next';
import ContactPage from '@/page-components/ContactPage';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Roots team for help with buying, selling, disputes, or any questions about the Thai plant marketplace.',
};

export default function Page() {
  return <ContactPage />;
}
