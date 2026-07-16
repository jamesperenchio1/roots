'use client'


import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Listing } from '@/types';

interface SubmittedViewProps {
  created: Listing | null;
}

export default function SubmittedView({ created }: SubmittedViewProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto text-center">
        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-light mb-2">{t('marketplace:provenance.listingSubmittedTitle')}</h1>
        <p className="text-zinc-500 mb-6">
          {t('marketplace:provenance.listingSubmittedDescription')}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/seller-dashboard"
            className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            {t('marketplace:create.goToDashboard')}
          </Link>
          <Link
            href={created ? `/listing/${created.id}` : '/browse'}
            className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
          >
            {t('marketplace:create.viewListing')}
          </Link>
        </div>
      </div>
    </div>
  );
}
