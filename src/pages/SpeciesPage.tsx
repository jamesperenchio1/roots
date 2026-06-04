import { useParams, Link } from 'react-router-dom';

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}
import { ArrowLeft, Leaf, Bell, X, Trash2 } from 'lucide-react';
import { getSpeciesById, getActiveListings, getPriceSnapshotsForSpecies, PLANT_IMAGES } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Sparkline } from '@/components/PriceChart';
import { useState, useEffect } from 'react';
import type { SizeCategory } from '@/types';
import PlantCareCard from '@/components/PlantCareCard';
import { useAuth } from '@/hooks/useAuth';
import { createPriceAlert, getUserPriceAlerts, deletePriceAlert } from '@/lib/api';
import { toast } from 'sonner';

export default function SpeciesPage() {
  const { id } = useParams<{ id: string }>();
  const species = getSpeciesById(id || '');
  const { user } = useAuth();
  const [sizeFilter, setSizeFilter] = useState<SizeCategory | undefined>(undefined);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('below');
  const [userAlerts, setUserAlerts] = useState(() => user ? getUserPriceAlerts(user.id).filter(a => a.species_id === id) : []);

  useEffect(() => {
    if (user && id) {
      setUserAlerts(getUserPriceAlerts(user.id).filter(a => a.species_id === id));
    }
  }, [user, id, alertModalOpen]);

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
            <div className="flex items-center gap-2 flex-wrap">
              {user && (
                <button
                  onClick={() => setAlertModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Bell className="w-3 h-3" /> Set Price Alert
                </button>
              )}
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
          </div>
          {userAlerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {userAlerts.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-zinc-800/30 border border-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Bell className="w-3 h-3 text-emerald-400" />
                    Alert when price goes {a.direction} {a.threshold_thb.toLocaleString()} THB
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deletePriceAlert(a.id);
                        setUserAlerts(prev => prev.filter(x => x.id !== a.id));
                        toast.success('Alert removed');
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to remove');
                      }
                    }}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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

        {/* Plant Care Guide */}
        <div className="mb-10">
          <PlantCareCard speciesName={species.scientific_name} />
        </div>

        {/* Price Alert Modal */}
        {alertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  Set Price Alert
                </h3>
                <button onClick={() => setAlertModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Notify me when price goes</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAlertDirection('below')}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${alertDirection === 'below' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      Below
                    </button>
                    <button
                      onClick={() => setAlertDirection('above')}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${alertDirection === 'above' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      Above
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Threshold (THB)</label>
                  <input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAlertModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const threshold = parseInt(alertThreshold, 10);
                    if (!user) { toast.info('Log in to set price alerts'); return; }
                    if (isNaN(threshold) || threshold < 1) { toast.error('Enter a valid threshold'); return; }
                    try {
                      await createPriceAlert({
                        user_id: user.id,
                        species_id: id || '',
                        size_category: sizeFilter,
                        threshold_thb: threshold,
                        direction: alertDirection,
                      });
                      toast.success('Price alert set!');
                      setAlertModalOpen(false);
                      setAlertThreshold('');
                      setUserAlerts(getUserPriceAlerts(user.id).filter(a => a.species_id === id));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to set alert');
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors"
                >
                  Save Alert
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <Sparkline data={Array.from({ length: 20 }, (_, i) => seededRandom(l.id, i) * 50 + l.price_thb * 0.8)} width={200} height={30} />
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
