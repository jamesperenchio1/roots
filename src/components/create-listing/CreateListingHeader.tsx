'use client'


import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CreateListingHeader() {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <>
      <Link
        href="/seller-dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {t('common:nav.sellerDashboard')}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight">{t('marketplace:create.title')}</h1>
          <p className="text-sm text-zinc-500">{t('marketplace:create.subtitle')}</p>
        </div>
        <span className="text-xs text-zinc-600 bg-zinc-800/50 px-3 py-1 rounded-full">
          {t('marketplace:create.stepIndicator')}
        </span>
      </div>
    </>
  );
}
