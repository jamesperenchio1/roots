import AuthGuard from '@/components/AuthGuard';
import DashboardPage from '@/page-components/DashboardPage';

export default function Page() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}
