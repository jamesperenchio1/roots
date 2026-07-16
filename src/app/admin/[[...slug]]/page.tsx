import AdminGuard from '@/components/AdminGuard';
import AdminPage from '@/page-components/AdminPage';

export default function Page() {
  return (
    <AdminGuard>
      <AdminPage />
    </AdminGuard>
  );
}
