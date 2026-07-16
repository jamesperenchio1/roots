import AuthGuard from '@/components/AuthGuard';
import DisputePage from '@/page-components/DisputePage';

export default function Page() {
  return (
    <AuthGuard>
      <DisputePage />
    </AuthGuard>
  );
}
