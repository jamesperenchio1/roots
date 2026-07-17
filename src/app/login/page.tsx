import { Suspense } from 'react';
import PublicOnlyGuard from '@/components/PublicOnlyGuard';
import LoginPage from '@/page-components/LoginPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PublicOnlyGuard>
        <LoginPage />
      </PublicOnlyGuard>
    </Suspense>
  );
}
