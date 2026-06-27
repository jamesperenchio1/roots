import { Navigate, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isRestoring } = useAuth();
  const location = useLocation();
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">Loading your account…</p>
      </div>
    );
  }
  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return <>{children}</>;
}
