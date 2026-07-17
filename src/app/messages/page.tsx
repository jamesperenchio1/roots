import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';
import MessagesPage from '@/page-components/MessagesPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuthGuard>
        <MessagesPage />
      </AuthGuard>
    </Suspense>
  );
}
