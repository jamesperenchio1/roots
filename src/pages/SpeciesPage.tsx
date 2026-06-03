import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Leaf } from 'lucide-react';
import { getSpeciesById, getActiveListings, getPriceSnapshotsForSpecies, PLANT_IMAGES } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Sparkline } from '@/components/PriceChart';
import { useState } from 'react';
import type { SizeCategory } from '@/types';

export default function SpeciesPage() {
  const { id } = useParams<{ id: string }>();
  const species = getSpeciesById(id || '');
  const [sizeFilter, setSizeFilter] = useState<SizeCategory | undefined>(undefined);

  if (!species) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">Species not found</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">Back to browse</Link>
      </div>
    );
  }

  const priceData = getPriceSnapshotsForSpecies(id || '', sizeFilter, 180).map(ps => ({
    date: ps.snapshot_date,
    price: ps.median_price_thb,
    volume: ps.sale_count
  }));

  const listings = getActiveListings({ speciesId: id }).filter(l => !sizeFilter || l.size_category === sizeFilter);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Browse
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-900 mb-4">
              <img src={PLANT_IMAGES[id || ''] || '/images/plants/monstera-thai.jpg'} alt={species.scientific_name} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-zinc-500 capitalize">{species.category}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{species.scientific_name}</h1>
            <p className="text-lg text-zinc-400 mb-1">{species.common_name_en}</p>
            <p className="text-sm text-zinc-500 mb-4">{species.common_name_th}</p>
            <p className="text-zinc-400 leading-relaxed mb-4">{species.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">Care: {species.care_level}</span>
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">Light: {species.light_requirement}</span>
              {species.synonyms?.map(s => (
                <span key={s} className="bg-zinc-800/30 px-3 py-1 rounded-full text-xs text-zinc-500">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-medium">Price History</h2>
              <p className="text-sm text-zinc-500">All sales data for this species</p>
            </div>
            <div className="flex gap-1">
              {([undefined, 'S', 'M', 'L', 'XL'] as const).map(s => (
                <button
                  key={s || 'all'}
                  onClick={() => setSizeFilter(s)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${sizeFilter === s ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          {priceData.length >= 3 ? (
            <>
              <PriceChart data={priceData} height={350} showVolume={true} />
              <div className="mt-6">
                <StatsPanel speciesId={id || ''} />
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-zinc-500">Insufficient sales data — be the first to set the market!</p>
            </div>
          )}
        </div>

        {/* Active Listings */}
        <div>
          <h2 className="text-lg font-medium mb-4">Active Listings ({listings.length})</h2>
          {listings.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(l => (
                <Link to={`/listing/${l.id}`} key={l.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-400 font-semibold">{l.price_thb.toLocaleString()} THB</span>
                    <span className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">{l.size_category}</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{l.description}</p>
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>{l.seller?.display_name}</span>
                    <span>{l.pickup_province}</span>
                  </div>
                  <Sparkline data={Array.from({ length: 20 }, () => Math.random() * 50 + l.price_thb * 0.8)} width={200} height={30} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">No active listings for this species.</p>
          )}
        </div>
      </div>
    </div>
  );
}
