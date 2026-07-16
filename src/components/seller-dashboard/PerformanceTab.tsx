'use client'

import type { TFunction } from 'i18next';
import type { Transaction } from '@/types';

interface PerformanceTabProps {
  allSales: Transaction[];
  t: TFunction;
}

export function PerformanceTab({ allSales, t }: PerformanceTabProps) {
  const avgRating = '5.0';
  const months = t('dashboard:seller.monthLabels', { returnObjects: true }) as string[];
  const monthly = Array(12).fill(0);
  allSales.forEach((s) => { const d = new Date(s.created_at); monthly[d.getMonth()]++; });
  const maxMonth = Math.max(...monthly, 1);

  const buyerMap: Record<string, { name: string; count: number; total: number }> = {};
  allSales.forEach((s) => {
    const id = s.buyer_id || 'unknown';
    if (!buyerMap[id]) buyerMap[id] = { name: s.buyer?.display_name || t('common:unknownUser'), count: 0, total: 0 };
    buyerMap[id].count++; buyerMap[id].total += s.sale_price_thb;
  });
  const topBuyers = Object.values(buyerMap).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.sellerScore')}</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center">
            <div className="text-center"><p className="text-2xl font-semibold">{avgRating}</p><p className="text-xs text-zinc-500">{t('dashboard:seller.scoreOutOf')}</p></div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: t('dashboard:seller.shippingSpeed'), score: Math.min(98, 70 + allSales.length * 2) },
              { label: t('dashboard:seller.plantCondition'), score: Math.min(98, 75 + allSales.length * 1.5) },
              { label: t('dashboard:seller.communication'), score: Math.min(98, 80 + allSales.length) },
              { label: t('dashboard:seller.valueForMoney'), score: Math.min(98, 72 + allSales.length * 1.2) },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-32">{item.label}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.score}%` }} /></div>
                <span className="text-xs text-zinc-500 w-8">{item.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.monthlyTrend')}</h3>
        <div className="flex items-end gap-2 h-32">
          {monthly.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-emerald-500/20 rounded-t" style={{ height: `${(v / maxMonth) * 100 || 4}%`, minHeight: 4 }}><div className="w-full bg-emerald-500 rounded-t" style={{ height: `${(v / maxMonth) * 60 || 2}%`, minHeight: 2 }} /></div>
              <span className="text-[10px] text-zinc-600">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-3">{t('dashboard:seller.topBuyers')}</h3>
        <div className="space-y-2">
          {topBuyers.length > 0 ? topBuyers.map((b) => (
            <div key={b.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium">{b.name.charAt(0)}</div>
                <div><p className="text-sm">{b.name}</p><p className="text-xs text-zinc-500">{b.count} {t('marketplace:seller.sales')}</p></div>
              </div>
              <div className="text-right text-xs text-zinc-500"><p>{b.total.toLocaleString()} {t('common:currency')}</p></div>
            </div>
          )) : <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noBuyerData')}</p>}
        </div>
      </div>
    </div>
  );
}
