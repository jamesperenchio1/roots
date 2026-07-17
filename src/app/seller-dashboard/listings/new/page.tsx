import { Suspense } from 'react';
import SellerGuard from '@/components/SellerGuard';
import CreateListingPage from '@/page-components/CreateListingPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SellerGuard>
        <CreateListingPage />
      </SellerGuard>
    </Suspense>
  );
}
