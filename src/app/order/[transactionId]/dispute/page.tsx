import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DisputePage from '@/page-components/DisputePage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthGuard>
        <DisputePage />
      </AuthGuard>
    </Suspense>
  );
}
