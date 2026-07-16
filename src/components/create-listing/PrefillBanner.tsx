import { useTranslation } from 'react-i18next';
import type { IdentificationResult } from '@/types';

interface PrefillBannerProps {
  prefillLoading: boolean;
  prefillResult: IdentificationResult | null;
}

export default function PrefillBanner({ prefillLoading, prefillResult }: PrefillBannerProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  if (prefillLoading) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-sm text-emerald-200">
        {t('marketplace:create.loadingIdentification')}
      </div>
    );
  }

  if (!prefillResult) return null;

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-6">
      <p className="text-sm font-medium text-emerald-300 mb-1">
        {t('marketplace:create.prefilledFromIdentification')}
      </p>
      <p className="text-sm text-zinc-400">
        {prefillResult.scientific_name}
        {prefillResult.common_names.length
          ? ` · ${t('marketplace:create.commonNames', { names: prefillResult.common_names.join(', ') })}`
          : ''}
        {prefillResult.market_estimate?.suggested_range_low
          ? ` · ${t('marketplace:create.suggestedPrice', {
              price: prefillResult.market_estimate.suggested_range_low.toLocaleString(),
              currency: t('common:currency'),
            })}`
          : ''}
      </p>
    </div>
  );
}
