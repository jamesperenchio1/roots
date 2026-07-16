import type { TFunction } from 'i18next';
import { Eye, Heart, Megaphone, TrendingUp } from 'lucide-react';
import { Sparkline } from '@/components/Sparkline';
import type { Listing, Transaction } from '@/types';

interface AnalyticsTabProps {
  listings: Listing[];
  allSales: Transaction[];
  t: TFunction;
}

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}

export function AnalyticsTab({ listings, allSales, t }: AnalyticsTabProps) {
  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalWatches = listings.reduce((s, l) => s + (l.watch_count || 0), 0);
  const conversionRate = totalViews > 0 ? ((allSales.length / totalViews) * 100).toFixed(1) : '0';

  const catSales: Record<string, number> = {};
  allSales.forEach((s) => {
    const cat = s.plant_id?.includes('aroid') ? 'aroid' : s.plant_id?.includes('hoya') ? 'hoya' : s.plant_id?.includes('succulent') ? 'succulent' : s.plant_id?.includes('fern') ? 'fern' : s.plant_id?.includes('orchid') ? 'orchid' : 'other';
    catSales[cat] = (catSales[cat] || 0) + 1;
  });
  const catEntries = Object.entries(catSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('dashboard:seller.totalViews'), value: totalViews.toLocaleString(), icon: Eye },
          { label: t('dashboard:seller.watchlistAdds'), value: totalWatches.toLocaleString(), icon: Heart },
          { label: t('dashboard:seller.messageInquiries'), value: allSales.length.toLocaleString(), icon: Megaphone },
          { label: t('dashboard:seller.conversionRate'), value: `${conversionRate}%`, icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <stat.icon className="w-4 h-4 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.popularListings')}</h3>
        {listings.length > 0 ? listings.slice(0, 5).map((l) => (
          <div key={l.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{l.species?.common_name_en}</p>
              <p className="text-xs text-zinc-500">{l.price_thb.toLocaleString()} {t('common:currency')} · {l.view_count || 0} {t('marketplace:listing.views')} · {l.watch_count || 0} {t('marketplace:listing.watches')}</p>
            </div>
            <Sparkline data={Array.from({ length: 20 }, (_, i) => seededRandom(l.id, i) * 100 + 50)} width={80} height={24} />
          </div>
        )) : <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noListings')}</p>}
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.salesByCategory')}</h3>
        <div className="space-y-2">
          {catEntries.length > 0 ? catEntries.map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-20 capitalize">{cat}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / catTotal) * 100}%` }} /></div>
              <span className="text-xs text-zinc-500 w-8 text-right">{count}</span>
            </div>
          )) : <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noSalesData')}</p>}
        </div>
      </div>
    </div>
  );
}
