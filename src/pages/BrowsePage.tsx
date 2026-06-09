import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { getActiveListings, PLANT_IMAGES } from '@/data/mockData';

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}
import { Sparkline } from '@/components/PriceChart';
import { usePagination } from '@/hooks/usePagination';
import { ListingCardSkeleton } from '@/components/ui/skeleton';
import { LazyImage } from '@/components/LazyImage';
import type { Category, SizeCategory } from '@/types';

const CATEGORIES: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'aroid', label: 'Aroids' },
  { value: 'hoya', label: 'Hoyas' },
  { value: 'cactus', label: 'Cacti' },
  { value: 'succulent', label: 'Succulents' },
  { value: 'fern', label: 'Ferns' },
  { value: 'orchid', label: 'Orchids' },
  { value: 'other', label: 'Other' },
];

const SIZES: { value: SizeCategory | ''; label: string }[] = [
  { value: '', label: 'All Sizes' },
  { value: 'S', label: 'Small' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Large' },
  { value: 'XL', label: 'Extra Large' },
];

const PROVINCES = ['', 'Bangkok', 'Chiang Mai', 'Chiang Rai', 'Phuket', 'Pattaya', 'Nonthaburi'];

const PAGE_SIZE = 12;

export default function BrowsePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<Category | ''>('');
  const [size, setSize] = useState<SizeCategory | ''>('');
  const [province, setProvince] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').toLowerCase().trim();

  // Simulate data loading for skeleton demo (removes after mount)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const listings = useMemo(() => {
    let result = getActiveListings({
      category: category || undefined,
      size: size || undefined,
      province: province || undefined,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });

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
  }, [category, size, province, minPrice, maxPrice, sortBy, q]);

  const { visibleItems, hasMore, loadMore, total } = usePagination(listings, { pageSize: PAGE_SIZE });

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{q ? `Results for "${q}"` : 'All Plants'}</h1>
            <p className="text-zinc-500">{total} listings — herbs to rare aroids</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${filtersOpen ? 'bg-white/10 border-white/20' : 'bg-zinc-900 border-white/10 hover:border-white/20'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category | '')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as SizeCategory | '')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Province</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {PROVINCES.map(p => <option key={p} value={p}>{p || 'All Provinces'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Price Range (THB)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-zinc-600">-</span>
                  <input
                    type="number"
                    placeholder="Max"
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
                <X className="w-3 h-3" /> Clear all filters
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
            visibleItems.map(listing => (
              <Link
                to={`/listing/${listing.id}`}
                key={listing.id}
                className="group block break-inside-avoid bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300"
              >
                <LazyImage
                  src={listing.photos?.[0]?.storage_path || PLANT_IMAGES[listing.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'}
                  alt={listing.species?.scientific_name || 'Plant listing'}
                  aspectRatio="3/4"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 mb-0.5 truncate">{listing.species?.scientific_name}</p>
                      <p className="text-sm font-medium truncate">{listing.species?.common_name_en || listing.species?.common_name_th}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-emerald-400 font-semibold text-sm">{listing.price_thb.toLocaleString()} THB</span>
                    <span className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">{listing.size_category}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Sparkline
                      data={Array.from({ length: 20 }, (_, i) => seededRandom(listing.id, i) * 50 + listing.price_thb * 0.8)}
                      width={50}
                      height={16}
                      color="#4ade80"
                    />
                    <span className="text-xs text-zinc-600">{listing.seller?.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-600">
                    <span>{listing.delivery_options?.includes('ship') && 'Shipping'}</span>
                    <span>{listing.delivery_options?.includes('pickup') && 'Pickup'}</span>
                    <span>{listing.pickup_province}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {!isLoading && hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="inline-flex items-center gap-2 bg-zinc-900 border border-white/10 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-zinc-800 transition-colors"
            >
              Load More
              <span className="text-zinc-500">({total - visibleItems.length} remaining)</span>
            </button>
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg mb-2">No listings found</p>
            <p className="text-zinc-600 text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
