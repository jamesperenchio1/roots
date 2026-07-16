import SellerGuard from '@/components/SellerGuard';
import CreateListingPage from '@/page-components/CreateListingPage';

export default function Page() {
  return (
    <SellerGuard>
      <CreateListingPage />
    </SellerGuard>
  );
}
