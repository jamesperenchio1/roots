import OwnershipGuard from '@/components/OwnershipGuard';
import EditListingPage from '@/page-components/EditListingPage';

export default function Page() {
  return (
    <OwnershipGuard>
      <EditListingPage />
    </OwnershipGuard>
  );
}
