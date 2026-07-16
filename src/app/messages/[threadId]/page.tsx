import AuthGuard from '@/components/AuthGuard';
import MessagesPage from '@/page-components/MessagesPage';

export default function Page() {
  return (
    <AuthGuard>
      <MessagesPage />
    </AuthGuard>
  );
}
