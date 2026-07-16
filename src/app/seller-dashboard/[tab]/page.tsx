import SellerGuard from '@/components/SellerGuard';
import SellerDashboardPage from '@/page-components/SellerDashboardPage';

export default function Page() {
  return (
    <SellerGuard>
      <SellerDashboardPage />
    </SellerGuard>
  );
}
