import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import OrderPage from '@/page-components/OrderPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthGuard>
        <OrderPage />
      </AuthGuard>
    </Suspense>
  );
}
