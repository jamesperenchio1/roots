import { useParams, Link } from 'react-router-dom';

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Bell, X, Trash2 } from 'lucide-react';
import { getSpeciesById, getActiveListings, getPriceSnapshotsForSpecies, PLANT_IMAGES } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Sparkline } from '@/components/PriceChart';
import { useState, useEffect } from 'react';
import type { SizeCategory } from '@/types';
import PlantCareCard from '@/components/PlantCareCard';
import { CommentSection } from '@/components/comments/CommentSection';
import { useAuth } from '@/hooks/useAuth';
import { getProvinceLabel } from '@/lib/provinces';
import { createPriceAlert, getUserPriceAlerts, deletePriceAlert } from '@/lib/api';
import { toast } from 'sonner';

const SIZE_OPTIONS: Array<{ value: SizeCategory | undefined; labelKey: string }> = [
  { value: undefined, labelKey: 'marketplace:species.sizeAll' },
  { value: 'S', labelKey: 'marketplace:species.sizeSmall' },
  { value: 'M', labelKey: 'marketplace:species.sizeMedium' },
  { value: 'L', labelKey: 'marketplace:species.sizeLarge' },
  { value: 'XL', labelKey: 'marketplace:species.sizeExtraLarge' },
];

export default function SpeciesPage() {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
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
        <h1 className="text-2xl mb-4">{t('marketplace:species.notFound')}</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">{t('marketplace:species.backToBrowse')}</Link>
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
          <ArrowLeft className="w-4 h-4" /> {t('common:actions.back')}
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
              <span className="text-sm text-zinc-500 capitalize">{t(`marketplace:categories.${species.category}` as const)}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{species.scientific_name}</h1>
            <p className="text-lg text-zinc-400 mb-1">{species.common_name_en}</p>
            <p className="text-sm text-zinc-500 mb-4">{species.common_name_th}</p>
            <p className="text-zinc-400 leading-relaxed mb-4">{species.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{t('marketplace:species.careLevel', { level: species.care_level })}</span>
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{t('marketplace:species.lightRequirement', { light: species.light_requirement })}</span>
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
              <h2 className="text-lg font-medium">{t('marketplace:listing.priceHistory')}</h2>
              <p className="text-sm text-zinc-500">{t('marketplace:species.priceHistorySubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {user && (
                <button
                  onClick={() => setAlertModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Bell className="w-3 h-3" /> {t('marketplace:species.setPriceAlert')}
                </button>
              )}
              <div className="flex gap-1">
                {SIZE_OPTIONS.map(s => (
                  <button
                    key={s.value || 'all'}
                    onClick={() => setSizeFilter(s.value)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${sizeFilter === s.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {t(s.labelKey)}
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
                    {t('marketplace:species.alertDescription', { direction: t(`marketplace:species.alert${a.direction === 'above' ? 'Above' : 'Below'}`), threshold: a.threshold_thb.toLocaleString(), currency: t('common:currency') })}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deletePriceAlert(a.id);
                        setUserAlerts(prev => prev.filter(x => x.id !== a.id));
                        toast.success(t('marketplace:species.alertRemoved'));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : t('marketplace:species.alertRemoveFailed'));
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
              <p className="text-zinc-500">{t('marketplace:species.insufficientData')}</p>
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
                  {t('marketplace:species.setPriceAlert')}
                </h3>
                <button onClick={() => setAlertModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">{t('marketplace:species.alertNotifyWhen')}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAlertDirection('below')}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${alertDirection === 'below' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      {t('marketplace:species.alertBelow')}
                    </button>
                    <button
                      onClick={() => setAlertDirection('above')}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${alertDirection === 'above' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      {t('marketplace:species.alertAbove')}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">{t('marketplace:species.alertThreshold')}</label>
                  <input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    placeholder={t('marketplace:species.alertThresholdPlaceholder')}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAlertModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
                >
                  {t('common:actions.cancel')}
                </button>
                <button
                  onClick={async () => {
                    const threshold = parseInt(alertThreshold, 10);
                    if (!user) { toast.info(t('marketplace:species.alertLoginRequired')); return; }
                    if (isNaN(threshold) || threshold < 1) { toast.error(t('marketplace:species.alertInvalidThreshold')); return; }
                    try {
                      await createPriceAlert({
                        user_id: user.id,
                        species_id: id || '',
                        size_category: sizeFilter,
                        threshold_thb: threshold,
                        direction: alertDirection,
                      });
                      toast.success(t('marketplace:species.alertSet'));
                      setAlertModalOpen(false);
                      setAlertThreshold('');
                      setUserAlerts(getUserPriceAlerts(user.id).filter(a => a.species_id === id));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : t('marketplace:species.alertSetFailed'));
                    }
                  }}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors"
                >
                  {t('marketplace:species.saveAlert')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Listings */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-4">{t('marketplace:species.activeListingsCount', { count: listings.length })}</h2>
          {listings.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(l => (
                <Link to={`/listing/${l.id}`} key={l.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-400 font-semibold">{l.price_thb.toLocaleString()} {t('common:currency')}</span>
                    <span className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">{l.size_category}</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">{l.description}</p>
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span>{l.seller?.display_name}</span>
                    <span>{getProvinceLabel(l.pickup_province, i18n.language)}</span>
                  </div>
                  <Sparkline data={Array.from({ length: 20 }, (_, i) => seededRandom(l.id, i) * 50 + l.price_thb * 0.8)} width={200} height={30} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">{t('marketplace:species.noActiveListings')}</p>
          )}
        </div>

        {/* Community Discussion */}
        <div id="discussion">
          <CommentSection speciesId={id || ''} />
        </div>
      </div>
    </div>
  );
}
