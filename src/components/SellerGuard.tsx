'use client'


import { usePathname, useSearchParams } from 'next/navigation';
import Redirect from '@/components/Redirect';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function SellerGuard({ children }: { children: React.ReactNode }) {
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

  // For launch we allow any verified, non-banned user to sell. In the future
  // this can be gated behind a seller verification flow (e.g. profile.is_seller).
  if (user.is_banned) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Leaf className="w-8 h-8 text-red-400" />
        <p className="text-sm text-zinc-300">{t('common:errors.unauthorized')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
