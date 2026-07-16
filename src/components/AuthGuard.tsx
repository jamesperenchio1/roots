'use client'


import { usePathname, useSearchParams } from 'next/navigation';
import Redirect from '@/components/Redirect';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { user, isRestoring } = useAuth();
  const pathname = usePathname();
const searchParams = useSearchParams();
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">{t('authGuard.loading')}</p>
      </div>
    );
  }
  if (!user) {
    return (
      <Redirect
        to={`/login?redirect=${encodeURIComponent(pathname + (searchParams?.toString() ?? ''))}`}
      />
    );
  }
  return <>{children}</>;
}
