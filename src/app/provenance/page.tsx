import type { Metadata } from 'next';
import ProvenancePage from '@/page-components/ProvenancePage';

export const metadata: Metadata = {
  title: 'Plant Provenance',
  description: 'Roots QR tags give every plant a verifiable ownership history — scan to see where your plant came from and who owned it.',
};

export default function Page() {
  return <ProvenancePage />;
}
