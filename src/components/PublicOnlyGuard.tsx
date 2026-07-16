'use client'


import Redirect from '@/components/Redirect';
import { useAuth } from '@/hooks/useAuth';

export default function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return null;
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return children;
}
