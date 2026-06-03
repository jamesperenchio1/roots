import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
