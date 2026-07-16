import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
