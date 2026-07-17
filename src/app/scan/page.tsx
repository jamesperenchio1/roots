import type { Metadata } from 'next';
import QRScannerPage from '@/page-components/QRScannerPage';

export const metadata: Metadata = {
  title: 'Scan QR Code',
  description: 'Scan a Roots plant QR tag to instantly verify ownership, provenance history, and authenticity.',
};

export default function Page() {
  return <QRScannerPage />;
}
