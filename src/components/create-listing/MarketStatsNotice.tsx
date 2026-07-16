import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

interface MarketStatsNoticeProps {
  marketStats: { median: number } | null | undefined;
  price: string;
  currency: string;
}

export default function MarketStatsNotice({ marketStats, price, currency }: MarketStatsNoticeProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  if (!marketStats || !price || parseInt(price) <= 0) return null;

  const pricePosition = ((parseInt(price) - marketStats.median) / marketStats.median) * 100;

  return (
    <div
      className={`rounded-lg p-3 text-sm ${
        Math.abs(pricePosition) < 20
          ? 'bg-emerald-500/10 border border-emerald-500/20'
          : pricePosition > 50
            ? 'bg-amber-500/10 border border-amber-500/20'
            : 'bg-blue-500/10 border border-blue-500/20'
      }`}
    >
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4" />
        <span>
          {Math.abs(pricePosition) < 20
            ? t('marketplace:create.pricePosition.similar', {
                percent: Math.abs(pricePosition).toFixed(0),
                median: marketStats.median.toLocaleString(),
                currency,
              })
            : pricePosition > 50
              ? t('marketplace:create.pricePosition.above', {
                  percent: Math.abs(pricePosition).toFixed(0),
                  median: marketStats.median.toLocaleString(),
                  currency,
                })
              : t('marketplace:create.pricePosition.below', {
                  percent: Math.abs(pricePosition).toFixed(0),
                  median: marketStats.median.toLocaleString(),
                  currency,
                })}
        </span>
      </div>
      {Math.abs(pricePosition) > 50 && (
        <p className="text-xs mt-1 text-amber-400">{t('marketplace:create.pricePosition.warning')}</p>
      )}
    </div>
  );
}
