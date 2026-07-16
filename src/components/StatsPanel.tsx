'use client'

import { useTranslation } from 'react-i18next';
import { usePriceSnapshots } from '@/hooks/queries/usePriceSnapshots';
import { useListingsBySpecies } from '@/hooks/queries/useListings';
import { computeSpeciesPriceStats } from '@/hooks/queries/useSpeciesPriceStats';

interface StatsPanelProps {
  speciesId: string;
  sizeCategory?: string;
  fallbackPrice?: number;
}

export function StatsPanel({ speciesId, sizeCategory, fallbackPrice }: StatsPanelProps) {
  const { t } = useTranslation(['marketplace', 'common']);
  const { data: allTimeData = [] } = usePriceSnapshots(speciesId, sizeCategory, 180);
  const { data: listings = [] } = useListingsBySpecies(speciesId, { sizeCategory });
  const stats30 = computeSpeciesPriceStats(allTimeData, listings, speciesId, 30);
  const stats90 = computeSpeciesPriceStats(allTimeData, listings, speciesId, 90);
  const trendPct = stats30 && stats90
    ? ((stats30.median - stats90.median) / stats90.median * 100)
    : 0;
  const allPrices = allTimeData.map(d => d.median_price_thb);
  const lowest = allPrices.length > 0 ? Math.min(...allPrices) : (fallbackPrice ?? 0);
  const highest = allPrices.length > 0 ? Math.max(...allPrices) : (fallbackPrice ?? 0);
  const totalSales = allTimeData.reduce((s, d) => s + d.sale_count, 0);

  const fmtPrice = (n: number) => `${n.toLocaleString()} ${t('common:currency')}`;

  const stats = [
    { label: t('marketplace:stats.median30d'), value: stats30 ? fmtPrice(stats30.median) : (fallbackPrice !== undefined ? fmtPrice(fallbackPrice) : t('marketplace:stats.na')) },
    { label: t('marketplace:stats.mean90d'), value: stats90 ? fmtPrice(stats90.mean) : (fallbackPrice !== undefined ? fmtPrice(fallbackPrice) : t('marketplace:stats.na')) },
    { label: t('marketplace:stats.lowest'), value: fmtPrice(lowest) },
    { label: t('marketplace:stats.highest'), value: fmtPrice(highest) },
    { label: t('marketplace:stats.totalSales'), value: `${totalSales}` },
    { label: t('marketplace:stats.trend'), value: `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(1)}%`, positive: trendPct >= 0 },
    { label: t('marketplace:stats.daysTracked'), value: `${allTimeData.length}` },
    { label: t('marketplace:stats.volatility'), value: allTimeData.length > 1 ? `${(Math.sqrt(allPrices.reduce((s, p) => s + Math.pow(p - (stats30?.mean || 0), 2), 0) / allPrices.length) / (stats30?.mean || 1) * 100).toFixed(0)}%` : t('marketplace:stats.na') },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
          <p className={`text-sm font-medium ${stat.positive ? 'text-emerald-400' : stat.positive === false ? 'text-red-400' : 'text-white'}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
