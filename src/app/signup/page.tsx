import PublicOnlyGuard from '@/components/PublicOnlyGuard';
import SignupPage from '@/page-components/SignupPage';

export default function Page() {
  return (
    <PublicOnlyGuard>
      <SignupPage />
    </PublicOnlyGuard>
  );
}
