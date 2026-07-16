import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Flame, Snowflake, Activity, DollarSign } from 'lucide-react';
import { ListingCard } from '@/components/ListingCard';
import { getSpeciesById } from '@/data/mockData';
import { getMarketSpeciesFromOverview } from '@/lib/api';
import { LazyPriceChart } from '@/components/LazyPriceChart';
import { Sparkline } from '@/components/Sparkline';
import { StatsPanel } from '@/components/StatsPanel';
import SpeciesAutocomplete from '@/components/SpeciesAutocomplete';
import { useMarketOverview } from '@/hooks/queries/useMarketOverview';
import { usePriceSnapshots } from '@/hooks/queries/usePriceSnapshots';
import { useListingsBySpecies } from '@/hooks/queries/useListings';
import type { LucideIcon } from 'lucide-react';
import type { Category, SizeCategory, MarketOverview } from '@/types';

function SectionHeader({ icon: Icon, titleKey, color }: { icon: LucideIcon; titleKey: string; color: string }) {
  const { t } = useTranslation('marketplace');
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${color}`} />
      <h2 className="text-lg font-medium">{t(titleKey)}</h2>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="shrink-0 w-56 bg-zinc-900/50 border border-white/5 rounded-xl p-4 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-zinc-800 mb-3" />
      <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
      <div className="h-3 bg-zinc-800 rounded w-1/2 mb-4" />
      <div className="h-10 bg-zinc-800/50 rounded mb-2" />
      <div className="flex justify-between mt-2">
        <div className="h-4 bg-zinc-800 rounded w-16" />
        <div className="h-4 bg-zinc-800 rounded w-12" />
      </div>
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/5 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded" />
      <div className="h-4 bg-zinc-800 rounded" />
      <div className="h-4 bg-zinc-800 rounded ml-auto w-16" />
      <div className="h-4 bg-zinc-800 rounded ml-auto w-20" />
    </div>
  );
}

function SpeciesCard({ item }: { item: MarketOverview['trending_up'][0] }) {
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
      {item.sparkline_data.length > 1 ? (
        <Sparkline data={item.sparkline_data} width={200} height={40} />
      ) : (
        <div className="h-10" />
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm">{Math.round(item.current_median).toLocaleString()} {t('common:currency')}</span>
        <span className={`text-xs font-medium ${item.percent_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {item.percent_change >= 0 ? '+' : ''}{item.percent_change.toFixed(1)}%
        </span>
      </div>
    </Link>
  );
}

function SpeciesSection({
  titleKey,
  icon,
  color,
  items,
}: {
  titleKey: string;
  icon: LucideIcon;
  color: string;
  items: MarketOverview['trending_up'];
}) {
  return (
    <section>
      <SectionHeader icon={icon} titleKey={titleKey} color={color} />
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {items.length > 0 ? (
          items.map(item => <SpeciesCard key={item.species.id} item={item} />)
        ) : (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
      </div>
    </section>
  );
}

const CATEGORIES: (Category | '')[] = ['', 'aroid', 'hoya', 'cactus', 'succulent', 'fern', 'orchid', 'other'];
const SIZES: (SizeCategory | '')[] = ['', 'S', 'M', 'L', 'XL'];

const SPECIES_STORAGE_KEY = 'roots.market.selectedSpecies';

export default function MarketPage() {
  const { t } = useTranslation(['marketplace', 'common']);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SPECIES_STORAGE_KEY);
      if (saved) setSelectedSpeciesId(saved);
    } catch {
      // Ignore storage errors.
    }
  }, []);
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [sizeFilter, setSizeFilter] = useState<SizeCategory | ''>('');
  const { data: market } = useMarketOverview();

  const marketSpecies = useMemo(() => getMarketSpeciesFromOverview(market), [market]);

  const selectedSpecies = useMemo(() => {
    if (selectedSpeciesId) {
      const saved = getSpeciesById(selectedSpeciesId);
      if (saved && marketSpecies.some((s) => s.id === saved.id)) return saved;
    }
    return market?.trending_up[0]?.species ?? market?.most_traded[0]?.species;
  }, [selectedSpeciesId, marketSpecies, market]);

  const filteredMarket = useMemo(
    () => ({
      trending_up: categoryFilter
        ? (market?.trending_up ?? []).filter((i) => i.species.category === categoryFilter)
        : (market?.trending_up ?? []),
      trending_down: categoryFilter
        ? (market?.trending_down ?? []).filter((i) => i.species.category === categoryFilter)
        : (market?.trending_down ?? []),
      most_traded: categoryFilter
        ? (market?.most_traded ?? []).filter((i) => i.species.category === categoryFilter)
        : (market?.most_traded ?? []),
      hot_right_now: categoryFilter
        ? (market?.hot_right_now ?? []).filter((i) => i.species.category === categoryFilter)
        : (market?.hot_right_now ?? []),
      cold: categoryFilter
        ? (market?.cold ?? []).filter((i) => i.species.category === categoryFilter)
        : (market?.cold ?? []),
      high_value_sales: categoryFilter
        ? (market?.high_value_sales ?? []).filter((t) => t.listing?.species?.category === categoryFilter)
        : (market?.high_value_sales ?? []),
    }),
    [market, categoryFilter]
  );

  const { data: priceSnapshots = [] } = usePriceSnapshots(selectedSpecies?.id, sizeFilter || undefined, 90);
  const priceData = useMemo(
    () => priceSnapshots.map((ps) => ({ date: ps.snapshot_date, price: ps.median_price_thb, volume: ps.sale_count })),
    [priceSnapshots]
  );

  const { data: speciesListings = [] } = useListingsBySpecies(selectedSpecies?.id, {
    sizeCategory: sizeFilter || undefined,
  });

  const handleSpeciesChange = (_value: string, entry?: { id: string }) => {
    if (!entry) return;
    const species = getSpeciesById(entry.id);
    if (!species) return;
    setSelectedSpeciesId(species.id);
    try {
      localStorage.setItem(SPECIES_STORAGE_KEY, species.id);
    } catch {
      // Ignore private mode / quota errors.
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{t('marketplace:market.overviewTitle')}</h1>
          <p className="text-zinc-500">{t('marketplace:market.overviewSubtitle')}</p>
        </div>

        {/* Featured Price Chart */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-4 gap-4">
            <div>
              <h2 className="text-lg font-medium mb-1">
                {selectedSpecies ? selectedSpecies.scientific_name : t('marketplace:create.speciesPlaceholder')}
              </h2>
              <p className="text-sm text-zinc-500">{t('marketplace:market.priceHistoryVolume')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <SpeciesAutocomplete
                value={selectedSpecies?.scientific_name ?? ''}
                onChange={handleSpeciesChange}
                placeholder={t('marketplace:create.speciesPlaceholder') as string}
                label={t('marketplace:create.speciesLabel') as string}
                category={categoryFilter}
              />
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">{t('marketplace:browse.category')}</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as Category | '')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">{t('marketplace:browse.categoryAll')}</option>
                  {CATEGORIES.filter(c => c).map(c => (
                    <option key={c} value={c}>{t(`marketplace:categories.${c}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">{t('marketplace:browse.size')}</label>
                <select
                  value={sizeFilter}
                  onChange={e => setSizeFilter(e.target.value as SizeCategory | '')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">{t('marketplace:browse.sizeAll')}</option>
                  {SIZES.filter(s => s).map(s => (
                    <option key={s} value={s}>{t(`marketplace:create.sizeLabels.${s}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <LazyPriceChart
            key={`${selectedSpecies?.id ?? 'none'}-${sizeFilter}`}
            data={priceData}
            height={300}
            showVolume={true}
          />
          <div className="mt-6">
            {selectedSpecies && (
              <StatsPanel speciesId={selectedSpecies.id} sizeCategory={sizeFilter || undefined} />
            )}
          </div>
        </div>

        {/* Active Listings */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-4">{t('marketplace:species.activeListingsCount', { count: speciesListings.length })}</h2>
          {speciesListings.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {speciesListings.map(l => (
                <ListingCard key={l.id} listing={l} layout="market" />
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">{t('marketplace:species.noActiveListings')}</p>
          )}
        </div>

        {/* Trending Sections */}
        <div className="space-y-10">
          <SpeciesSection
            titleKey="marketplace:market.trendingUp"
            icon={TrendingUp}
            color="text-emerald-400"
            items={filteredMarket.trending_up}
          />

          <SpeciesSection
            titleKey="marketplace:market.trendingDown"
            icon={TrendingDown}
            color="text-red-400"
            items={filteredMarket.trending_down}
          />

          <SpeciesSection
            titleKey="marketplace:market.mostTraded"
            icon={Activity}
            color="text-blue-400"
            items={filteredMarket.most_traded}
          />

          <SpeciesSection
            titleKey="marketplace:market.hotRightNow"
            icon={Flame}
            color="text-orange-400"
            items={filteredMarket.hot_right_now}
          />

          <SpeciesSection
            titleKey="marketplace:market.coolingOff"
            icon={Snowflake}
            color="text-cyan-400"
            items={filteredMarket.cold}
          />

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
              {filteredMarket.high_value_sales.length > 0 ? (
                filteredMarket.high_value_sales.map(tx => (
                  <div key={tx.id} className="grid grid-cols-4 gap-4 px-6 py-3 text-sm border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <span className="truncate">{tx.listing?.species?.scientific_name ?? tx.plant_id}</span>
                    <span className="text-zinc-400 truncate">{tx.seller?.display_name}</span>
                    <span className="text-right font-medium">{tx.sale_price_thb.toLocaleString()} {t('common:currency')}</span>
                    <span className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {t(`common:status.${tx.status}`)}
                      </span>
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                  <SkeletonTableRow />
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
