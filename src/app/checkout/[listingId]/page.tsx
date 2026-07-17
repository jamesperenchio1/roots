import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import CheckoutPage from '@/page-components/CheckoutPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthGuard>
        <CheckoutPage />
      </AuthGuard>
    </Suspense>
  );
}
