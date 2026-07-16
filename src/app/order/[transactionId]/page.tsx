import AuthGuard from '@/components/AuthGuard';
import OrderPage from '@/page-components/OrderPage';

export default function Page() {
  return (
    <AuthGuard>
      <OrderPage />
    </AuthGuard>
  );
}
