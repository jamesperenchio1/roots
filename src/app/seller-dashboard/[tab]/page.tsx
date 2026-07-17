import { Suspense } from 'react';
import SellerGuard from '@/components/SellerGuard';
import SellerDashboardPage from '@/page-components/SellerDashboardPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SellerGuard>
        <SellerDashboardPage />
      </SellerGuard>
    </Suspense>
  );
}
