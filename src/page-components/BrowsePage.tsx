'use client'

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';

import { usePaginatedListings } from '@/hooks/queries/useListings';
import { ListingCardSkeleton } from '@/components/ui/skeleton';
import { ListingCard } from '@/components/ListingCard';
import { getProvinceLabel, getProvinceOptions } from '@/lib/provinces';
import { BROWSE_CATEGORIES } from '@/lib/categories';
import type { Category, SizeCategory } from '@/types';

const SIZES: { value: SizeCategory; labelKey: string }[] = [
  { value: 'S', labelKey: 'marketplace:browse.sizeSmall' },
  { value: 'M', labelKey: 'marketplace:browse.sizeMedium' },
  { value: 'L', labelKey: 'marketplace:browse.sizeLarge' },
  { value: 'XL', labelKey: 'marketplace:browse.sizeExtraLarge' },
];

type SortBy = 'newest' | 'price-low' | 'price-high';
const SORTS: SortBy[] = ['newest', 'price-low', 'price-high'];
const PAGE_SIZE = 12;

const fieldClass =
  'w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus:border-emerald-500/50';

interface BrowsePageProps {
  /** Set by the /browse/[category] route; the URL path is then the source of truth for category. */
  category?: Category;
}

/** The URL is the single source of truth for filters, so results are shareable and survive back/forward. */
export default function BrowsePage({ category: routeCategory }: BrowsePageProps) {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const size = (searchParams?.get('size') as SizeCategory | null) ?? '';
  const province = searchParams?.get('province') ?? '';
  const minParam = searchParams?.get('min') ?? '';
  const maxParam = searchParams?.get('max') ?? '';
  const sortParam = searchParams?.get('sort') as SortBy | null;
  const sortBy: SortBy = sortParam && SORTS.includes(sortParam) ? sortParam : 'newest';
  const q = (searchParams?.get('q') || '').trim();
  const showAll = searchParams?.get('all') === '1';
  const category: Category | '' = routeCategory ?? ((searchParams?.get('category') as Category | null) || '');

  // Price inputs are committed on blur / Enter so every keystroke doesn't trigger a query.
  const [minDraft, setMinDraft] = useState(minParam);
  const [maxDraft, setMaxDraft] = useState(maxParam);
  useEffect(() => setMinDraft(minParam), [minParam]);
  useEffect(() => setMaxDraft(maxParam), [maxParam]);

  const provinceOptions = useMemo(() => getProvinceOptions(i18n.language || 'en'), [i18n.language]);

  const buildUrl = (next: Partial<Record<'size' | 'province' | 'min' | 'max' | 'sort' | 'q' | 'category', string>>, nextCategory = category) => {
    const merged: Record<string, string> = {
      size, province, min: minParam, max: maxParam, sort: sortBy === 'newest' ? '' : sortBy, q, ...next,
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const base = nextCategory ? `/browse/${nextCategory}` : '/browse';
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const update = (next: Parameters<typeof buildUrl>[0]) => router.replace(buildUrl(next), { scroll: false });
  const setCategory = (c: Category | '') => router.push(buildUrl({}, c), { scroll: false });

  const filters = useMemo(() => ({
    category,
    size: size as SizeCategory | '',
    province,
    minPrice: minParam ? parseInt(minParam, 10) : undefined,
    maxPrice: maxParam ? parseInt(maxParam, 10) : undefined,
    q,
    sortBy,
  }), [category, size, province, minParam, maxParam, q, sortBy]);

  const pageSize = showAll ? 1000 : PAGE_SIZE;
  const {
    data,
    isPending: isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePaginatedListings(filters, { pageSize });

  const listings = useMemo(() => data?.pages.flatMap((page) => page.listings) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const hasMore = !showAll && !!hasNextPage;

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (category) chips.push({ key: 'category', label: t(`marketplace:categories.${category}`), onRemove: () => setCategory('') });
  if (size) chips.push({ key: 'size', label: t(SIZES.find((s) => s.value === size)?.labelKey ?? 'marketplace:browse.size'), onRemove: () => update({ size: '' }) });
  if (province) chips.push({ key: 'province', label: getProvinceLabel(province, i18n.language || 'en'), onRemove: () => update({ province: '' }) });
  if (minParam || maxParam) {
    chips.push({
      key: 'price',
      label: `฿${minParam || '0'} – ${maxParam ? `฿${maxParam}` : '∞'}`,
      onRemove: () => update({ min: '', max: '' }),
    });
  }
  if (q) chips.push({ key: 'q', label: `“${q}”`, onRemove: () => update({ q: '' }) });

  const heading = q
    ? t('marketplace:browse.resultsForQuery', { query: q })
    : category
      ? t(`marketplace:categories.${category}`)
      : t('marketplace:browse.allPlants');

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{heading}</h1>
            <p className="text-zinc-500" aria-live="polite">{t('marketplace:browse.listingCount', { count: total })}</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor={`${uid}-sort`} className="sr-only">{t('marketplace:browse.sortBy', { defaultValue: 'Sort by' })}</label>
            <select
              id={`${uid}-sort`}
              value={sortBy}
              onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <option value="newest">{t('marketplace:browse.sortNewest')}</option>
              <option value="price-low">{t('marketplace:browse.sortPriceLow')}</option>
              <option value="price-high">{t('marketplace:browse.sortPriceHigh')}</option>
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
              aria-controls={`${uid}-filters`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500/60 ${filtersOpen ? 'bg-white/10 border-white/20' : 'bg-zinc-900 border-white/10 hover:border-white/20'}`}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              {t('marketplace:browse.filters')}
              {chips.length > 0 && (
                <span className="ml-1 rounded-full bg-emerald-500 text-black text-xs px-1.5 min-w-5 text-center">{chips.length}</span>
              )}
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-6" aria-label={t('marketplace:browse.filters')}>
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={t('marketplace:browse.removeFilter', { label: chip.label })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  {chip.label}
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => router.push('/browse')}
                className="text-xs text-zinc-500 hover:text-white px-2 py-1.5"
              >
                {t('marketplace:browse.clearFilters')}
              </button>
            </li>
          </ul>
        )}

        {filtersOpen && (
          <div id={`${uid}-filters`} className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor={`${uid}-cat`} className="text-xs text-zinc-400 mb-1.5 block">{t('marketplace:browse.category')}</label>
                <select id={`${uid}-cat`} value={category} onChange={(e) => setCategory(e.target.value as Category | '')} className={fieldClass}>
                  <option value="">{t('marketplace:browse.categoryAll')}</option>
                  {BROWSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`marketplace:categories.${c}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-size`} className="text-xs text-zinc-400 mb-1.5 block">{t('marketplace:browse.size')}</label>
                <select id={`${uid}-size`} value={size} onChange={(e) => update({ size: e.target.value })} className={fieldClass}>
                  <option value="">{t('marketplace:browse.sizeAll')}</option>
                  {SIZES.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-prov`} className="text-xs text-zinc-400 mb-1.5 block">{t('marketplace:browse.province')}</label>
                <select id={`${uid}-prov`} value={province} onChange={(e) => update({ province: e.target.value })} className={fieldClass}>
                  <option value="">{t('marketplace:browse.provinceAll')}</option>
                  {provinceOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <span id={`${uid}-price`} className="text-xs text-zinc-400 mb-1.5 block">{t('marketplace:browse.priceRange')}</span>
                <div className="flex items-center gap-2" role="group" aria-labelledby={`${uid}-price`}>
                  <input
                    type="number" inputMode="numeric" min={0}
                    aria-label={t('marketplace:browse.min')}
                    placeholder={t('marketplace:browse.min')}
                    value={minDraft}
                    onChange={(e) => setMinDraft(e.target.value)}
                    onBlur={() => minDraft !== minParam && update({ min: minDraft })}
                    onKeyDown={(e) => e.key === 'Enter' && update({ min: minDraft })}
                    className={fieldClass}
                  />
                  <span className="text-zinc-600" aria-hidden="true">-</span>
                  <input
                    type="number" inputMode="numeric" min={0}
                    aria-label={t('marketplace:browse.max')}
                    placeholder={t('marketplace:browse.max')}
                    value={maxDraft}
                    onChange={(e) => setMaxDraft(e.target.value)}
                    onBlur={() => maxDraft !== maxParam && update({ max: maxDraft })}
                    onKeyDown={(e) => e.key === 'Enter' && update({ max: maxDraft })}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isError ? (
          <div role="alert" className="text-center py-20">
            <p className="text-lg mb-2">{t('marketplace:browse.loadError')}</p>
            <p className="text-zinc-500 text-sm mb-4">{t('marketplace:browse.loadErrorHint')}</p>
            <button type="button" onClick={() => refetch()} className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400">
              {t('common:actions.retry')}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
              {isLoading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ListingCardSkeleton key={i} />)
                : listings.map((listing) => <ListingCard key={listing.id} listing={listing} layout="browse" />)}
            </div>

            {!isLoading && hasMore && (
              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="inline-flex items-center gap-2 bg-zinc-900 border border-white/10 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isFetchingNextPage ? t('common:actions.loading') : t('common:actions.loadMore')}
                  <span className="text-zinc-500">({t('marketplace:browse.remaining', { count: Math.max(total - listings.length, 0) })})</span>
                </button>
              </div>
            )}

            {!isLoading && listings.length === 0 && (
              <div className="text-center py-20">
                <p className="text-zinc-500 text-lg mb-2">{t('marketplace:browse.noListings')}</p>
                <p className="text-zinc-600 text-sm">{t('marketplace:browse.adjustFilters')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
