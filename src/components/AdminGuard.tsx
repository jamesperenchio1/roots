import { Navigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { isAdmin, isRestoring } = useAuth();
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">{t('common:admin.loading')}</p>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
