import AdminGuard from '@/components/AdminGuard';
import AdminPage from '@/page-components/AdminPage';

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return (
    <AdminGuard>
      <AdminPage slug={slug?.[0] ?? ''} />
    </AdminGuard>
  );
}