import { Suspense } from 'react';
import PublicOnlyGuard from '@/components/PublicOnlyGuard';
import SignupPage from '@/page-components/SignupPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PublicOnlyGuard>
        <SignupPage />
      </PublicOnlyGuard>
    </Suspense>
  );
}
