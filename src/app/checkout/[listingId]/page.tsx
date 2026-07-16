import AuthGuard from '@/components/AuthGuard';
import CheckoutPage from '@/page-components/CheckoutPage';

export default function Page() {
  return (
    <AuthGuard>
      <CheckoutPage />
    </AuthGuard>
  );
}
