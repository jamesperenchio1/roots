import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Flame, Snowflake, Activity, DollarSign } from 'lucide-react';
import { getMarketOverview, getPriceSnapshotsForSpecies, getMarketSpecies } from '@/data/mockData';
import { PriceChart, Sparkline } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import type { LucideIcon } from 'lucide-react';

function SectionHeader({ icon: Icon, titleKey, color }: { icon: LucideIcon; titleKey: string; color: string }) {
  const { t } = useTranslation('marketplace');
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${color}`} />
      <h2 className="text-lg font-medium">{t(titleKey)}</h2>
    </div>
  );
}

function SpeciesCard({ item }: { item: ReturnType<typeof getMarketOverview>['trending_up'][0] }) {
  const { t } = useTranslation(['marketplace', 'common']);
  return (
    <Link
      to={`/species/${item.species.id}`}
      className="shrink-0 w-56 bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-white/15 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 text-sm font-medium group-hover:bg-zinc-700 transition-colors">
        {item.species.scientific_name.charAt(0)}
      </div>
      <p className="text-sm font-medium truncate mb-1">{item.species.scientific_name.split(' ').slice(0, 2).join(' ')}</p>
      <p className="text-xs text-zinc-500 mb-3">{t('marketplace:market.salesCount', { count: item.sales_count })}</p>
      <Sparkline data={item.sparkline_data} width={200} height={40} />
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm">{Math.round(item.current_median).toLocaleString()} {t('common:currency')}</span>
        <span className={`text-xs font-medium ${item.percent_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {item.percent_change >= 0 ? '+' : ''}{item.percent_change.toFixed(1)}%
        </span>
      </div>
    </Link>
  );
}

export default function MarketPage() {
  const { t } = useTranslation(['marketplace', 'common']);
  const marketSpecies = getMarketSpecies();
  const [selectedSpecies, setSelectedSpecies] = useState(marketSpecies[0]);
  const market = getMarketOverview();
  const priceData = getPriceSnapshotsForSpecies(selectedSpecies.id, undefined, 90).map(ps => ({
    date: ps.snapshot_date,
    price: ps.median_price_thb,
    volume: ps.sale_count
  }));

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{t('marketplace:market.overviewTitle')}</h1>
          <p className="text-zinc-500">{t('marketplace:market.overviewSubtitle')}</p>
        </div>

        {/* Featured Price Chart */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-medium mb-1">{selectedSpecies.scientific_name}</h2>
              <p className="text-sm text-zinc-500">{t('marketplace:market.priceHistoryVolume')}</p>
            </div>
            <select
              value={selectedSpecies.id}
              onChange={(e) => setSelectedSpecies(marketSpecies.find(s => s.id === e.target.value) || marketSpecies[0])}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {marketSpecies.map(s => (
                <option key={s.id} value={s.id}>{s.scientific_name}</option>
              ))}
            </select>
          </div>
          <PriceChart data={priceData} height={300} showVolume={true} />
          <div className="mt-6">
            <StatsPanel speciesId={selectedSpecies.id} />
          </div>
        </div>

        {/* Trending Sections */}
        <div className="space-y-10">
          <section>
            <SectionHeader icon={TrendingUp} titleKey="marketplace:market.trendingUp" color="text-emerald-400" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {market.trending_up.map(item => <SpeciesCard key={item.species.id} item={item} />)}
            </div>
          </section>

          <section>
            <SectionHeader icon={TrendingDown} titleKey="marketplace:market.trendingDown" color="text-red-400" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {market.trending_down.map(item => <SpeciesCard key={item.species.id} item={item} />)}
            </div>
          </section>

          <section>
            <SectionHeader icon={Activity} titleKey="marketplace:market.mostTraded" color="text-blue-400" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {market.most_traded.map(item => <SpeciesCard key={item.species.id} item={item} />)}
            </div>
          </section>

          <section>
            <SectionHeader icon={Flame} titleKey="marketplace:market.hotRightNow" color="text-orange-400" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {market.hot_right_now.map(item => <SpeciesCard key={item.species.id} item={item} />)}
            </div>
          </section>

          <section>
            <SectionHeader icon={Snowflake} titleKey="marketplace:market.coolingOff" color="text-cyan-400" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {market.cold.map(item => <SpeciesCard key={item.species.id} item={item} />)}
            </div>
          </section>

          {/* High Value Sales */}
          <section>
            <SectionHeader icon={DollarSign} titleKey="marketplace:market.highValue" color="text-amber-400" />
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 gap-4 px-6 py-3 text-xs text-zinc-500 border-b border-white/5">
                <span>{t('marketplace:market.tablePlant')}</span>
                <span>{t('marketplace:market.tableSeller')}</span>
                <span className="text-right">{t('marketplace:market.tablePrice')}</span>
                <span className="text-right">{t('marketplace:market.tableStatus')}</span>
              </div>
              {market.high_value_sales.map(tx => (
                <div key={tx.id} className="grid grid-cols-4 gap-4 px-6 py-3 text-sm border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <span className="truncate">{tx.plant_id}</span>
                  <span className="text-zinc-400 truncate">{tx.seller?.display_name}</span>
                  <span className="text-right font-medium">{tx.sale_price_thb.toLocaleString()} {t('common:currency')}</span>
                  <span className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {t(`common:status.${tx.status}`)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
