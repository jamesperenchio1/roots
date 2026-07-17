import { Suspense } from 'react';
import IdentifyPage from '@/page-components/IdentifyPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <IdentifyPage />
    </Suspense>
  );
}
