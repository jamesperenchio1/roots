import type { Metadata } from 'next';
import ShippingGuidePage from '@/page-components/ShippingGuidePage';

export const metadata: Metadata = {
  title: 'Shipping Guide',
  description: 'Step-by-step guide for packaging and shipping live plants safely in Thailand — from substrate choice to handover at the courier.',
};

export default function Page() {
  return <ShippingGuidePage />;
}
