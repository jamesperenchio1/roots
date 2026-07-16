import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useListings } from '@/hooks/queries/useListings';

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}
import { usePagination } from '@/hooks/usePagination';
import { ListingCardSkeleton } from '@/components/ui/skeleton';
import { ListingCard } from '@/components/ListingCard';
import type { Category, SizeCategory } from '@/types';

const CATEGORIES: { value: Category | ''; labelKey: string }[] = [
  { value: '', labelKey: 'marketplace:browse.categoryAll' },
  { value: 'aroid', labelKey: 'marketplace:categories.aroid' },
  { value: 'hoya', labelKey: 'marketplace:categories.hoya' },
  { value: 'cactus', labelKey: 'marketplace:categories.cactus' },
  { value: 'succulent', labelKey: 'marketplace:categories.succulent' },
  { value: 'fern', labelKey: 'marketplace:categories.fern' },
  { value: 'orchid', labelKey: 'marketplace:categories.orchid' },
  { value: 'other', labelKey: 'marketplace:categories.other' },
];

const SIZES: { value: SizeCategory | ''; labelKey: string }[] = [
  { value: '', labelKey: 'marketplace:browse.sizeAll' },
  { value: 'S', labelKey: 'marketplace:browse.sizeSmall' },
  { value: 'M', labelKey: 'marketplace:browse.sizeMedium' },
  { value: 'L', labelKey: 'marketplace:browse.sizeLarge' },
  { value: 'XL', labelKey: 'marketplace:browse.sizeExtraLarge' },
];

const PROVINCES = ['', 'Bangkok', 'Chiang Mai', 'Chiang Rai', 'Phuket', 'Pattaya', 'Nonthaburi'];

const PAGE_SIZE = 12;

export default function BrowsePage() {
  const { t } = useTranslation(['marketplace', 'common']);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<Category | ''>('');
  const [size, setSize] = useState<SizeCategory | ''>('');
  const [province, setProvince] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const showAll = searchParams.get('all') === '1';

  const { data: allListings, isPending: isLoading } = useListings();

  const listings = useMemo(() => {
    let result = allListings ? [...allListings] : [];
    if (category) result = result.filter((l) => l.species?.category === category);
    if (size) result = result.filter((l) => l.size_category === size);
    if (province) result = result.filter((l) => l.pickup_province === province);
    if (minPrice) result = result.filter((l) => l.price_thb >= parseInt(minPrice));
    if (maxPrice) result = result.filter((l) => l.price_thb <= parseInt(maxPrice));

    if (q) {
      result = result.filter((l) => {
        const hay = [
          l.species?.common_name_en,
          l.species?.common_name_th,
          l.species?.scientific_name,
          l.description,
          l.seller?.display_name,
          l.pickup_province,
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    switch (sortBy) {
      case 'price-low': result = [...result].sort((a, b) => a.price_thb - b.price_thb); break;
      case 'price-high': result = [...result].sort((a, b) => b.price_thb - a.price_thb); break;
      default: result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [allListings, category, size, province, minPrice, maxPrice, sortBy, q]);

  const { visibleItems, hasMore, loadMore, total } = usePagination(listings, { pageSize: showAll ? listings.length : PAGE_SIZE });
  const itemsToRender = showAll ? listings : visibleItems;

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">
              {q ? t('marketplace:browse.resultsForQuery', { query: q }) : t('marketplace:browse.allPlants')}
            </h1>
            <p className="text-zinc-500">{t('marketplace:browse.listingCount', { count: total })}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="newest">{t('marketplace:browse.sortNewest')}</option>
              <option value="price-low">{t('marketplace:browse.sortPriceLow')}</option>
              <option value="price-high">{t('marketplace:browse.sortPriceHigh')}</option>
            </select>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${filtersOpen ? 'bg-white/10 border-white/20' : 'bg-zinc-900 border-white/10 hover:border-white/20'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t('marketplace:browse.filters')}
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">{t('marketplace:browse.category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category | '')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">{t('marketplace:browse.size')}</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as SizeCategory | '')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {SIZES.map(s => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">{t('marketplace:browse.province')}</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {PROVINCES.map(p => <option key={p} value={p}>{p || t('marketplace:browse.provinceAll')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">{t('marketplace:browse.priceRange')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={t('marketplace:browse.min')}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-zinc-600">-</span>
                  <input
                    type="number"
                    placeholder={t('marketplace:browse.max')}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setCategory(''); setSize(''); setProvince(''); setMinPrice(''); setMaxPrice(''); }}
                className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> {t('marketplace:browse.clearFilters')}
              </button>
            </div>
          </div>
        )}

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {isLoading ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))
          ) : (
            itemsToRender.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                layout="browse"
                sparklineData={Array.from({ length: 20 }, (_, i) => seededRandom(listing.id, i) * 50 + listing.price_thb * 0.8)}
              />
            ))
          )}
        </div>

        {!isLoading && hasMore && !showAll && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 bg-zinc-900 border border-white/10 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-zinc-800 transition-colors"
            >
              {t('common:actions.loadMore')}
              <span className="text-zinc-500">
                ({t('marketplace:browse.remaining', { count: total - visibleItems.length })})
              </span>
            </button>
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg mb-2">{t('marketplace:browse.noListings')}</p>
            <p className="text-zinc-600 text-sm">{t('marketplace:browse.adjustFilters')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
