import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DashboardPage from '@/page-components/DashboardPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    </Suspense>
  );
}
