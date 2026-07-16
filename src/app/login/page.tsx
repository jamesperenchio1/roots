import PublicOnlyGuard from '@/components/PublicOnlyGuard';
import LoginPage from '@/page-components/LoginPage';

export default function Page() {
  return (
    <PublicOnlyGuard>
      <LoginPage />
    </PublicOnlyGuard>
  );
}
