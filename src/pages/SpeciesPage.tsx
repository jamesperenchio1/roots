import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Bell, X, Trash2, Search } from 'lucide-react';
import { getSpeciesById, PLANT_IMAGES } from '@/data/mockData';
import { useListings } from '@/hooks/queries/useListings';
import { usePriceSnapshots } from '@/hooks/queries/usePriceSnapshots';
import { usePriceAlerts } from '@/hooks/queries/useUserData';
import { normalizeSpeciesName } from '@/data/speciesDatabase';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { ListingCard } from '@/components/ListingCard';
import { useState, useEffect, useMemo } from 'react';
import type { SizeCategory } from '@/types';
import PlantCareCard from '@/components/PlantCareCard';
import { CommentSection } from '@/components/comments/CommentSection';
import { useAuth } from '@/hooks/useAuth';

import { createPriceAlert, deletePriceAlert } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { userKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { fetchGbifSpecies, fetchINaturalistTaxon, fetchWikipediaSummary } from '@/lib/plantWiki';
import type { GbifSpecies, INaturalistTaxon, WikipediaSummary } from '@/lib/plantWiki';

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}

const SIZE_OPTIONS: Array<{ value: SizeCategory | undefined; labelKey: string }> = [
  { value: undefined, labelKey: 'marketplace:species.sizeAll' },
  { value: 'S', labelKey: 'marketplace:species.sizeSmall' },
  { value: 'M', labelKey: 'marketplace:species.sizeMedium' },
  { value: 'L', labelKey: 'marketplace:species.sizeLarge' },
  { value: 'XL', labelKey: 'marketplace:species.sizeExtraLarge' },
];

interface WikiData {
  gbif: GbifSpecies | null;
  inat: INaturalistTaxon | null;
  wiki: WikipediaSummary | null;
}

export default function SpeciesPage() {
  const { t } = useTranslation(['marketplace', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const rawId = decodeURIComponent(id || '').trim();
  const localSpecies = useMemo(() => getSpeciesById(rawId) || null, [rawId]);

  const [wiki, setWiki] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [sizeFilter, setSizeFilter] = useState<SizeCategory | undefined>(undefined);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('below');
  const { data: userAlertsRaw } = usePriceAlerts(user?.id);
  const userAlerts = useMemo(
    () => (id ? (userAlertsRaw || []).filter((a) => a.species_id === id) : []),
    [userAlertsRaw, id]
  );

  useEffect(() => {
    let cancelled = false;
    setWiki(null);
    setLoading(true);
    setSelectedImage(0);

    const externalName = localSpecies?.scientific_name || rawId.replace(/-/g, ' ');

    Promise.all([
      fetchGbifSpecies(externalName),
      fetchINaturalistTaxon(externalName),
      fetchWikipediaSummary(externalName),
    ]).then(([gbif, inat, wikiSummary]) => {
      if (cancelled) return;
      setWiki({ gbif, inat, wiki: wikiSummary });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [localSpecies, rawId]);

  const display = useMemo(() => {
    const gbif = wiki?.gbif;
    const inat = wiki?.inat;
    const summary = wiki?.wiki;

    const scientificName = localSpecies?.scientific_name || gbif?.scientificName || inat?.name || rawId;
    const commonNameEn = localSpecies?.common_name_en || inat?.preferred_common_name || summary?.title || '';
    const commonNameTh = localSpecies?.common_name_th || '';
    const description = localSpecies?.description || summary?.extract || inat?.wikipedia_summary || '';
    const family = gbif?.family || inat?.ancestors?.find(a => a.rank === 'family')?.name || '';
    const genus = gbif?.genus || inat?.ancestors?.find(a => a.rank === 'genus')?.name || '';
    const category = localSpecies?.category || 'other';

    const images: string[] = [];
    if (localSpecies && rawId && PLANT_IMAGES[rawId]) {
      images.push(PLANT_IMAGES[rawId]);
    }
    if (inat?.taxon_photos) {
      inat.taxon_photos.slice(0, 8).forEach(tp => {
        const url = tp.photo?.medium_url || tp.photo?.url;
        if (url && !images.includes(url)) images.push(url);
      });
    }
    if (inat?.default_photo?.url && !images.includes(inat.default_photo.url)) {
      images.push(inat.default_photo.url);
    }
    if (summary?.thumbnail?.source && !images.includes(summary.thumbnail.source)) {
      images.push(summary.thumbnail.source);
    }
    if (images.length === 0) {
      images.push('/images/plants/monstera-thai.jpg');
    }

    return {
      scientificName,
      commonNameEn,
      commonNameTh,
      description,
      family,
      genus,
      category,
      images,
      careLevel: localSpecies?.care_level,
      light: localSpecies?.light_requirement,
      synonyms: localSpecies?.synonyms || [],
    };
  }, [localSpecies, rawId, wiki]);

  const chartId = localSpecies?.id || rawId;

  const { data: allListings } = useListings();
  const speciesListings = useMemo(() => {
    const base = (allListings || []).filter((l) => {
      if (localSpecies) return l.species?.id === localSpecies.id;
      const name = l.species?.scientific_name;
      return name ? normalizeSpeciesName(name) === normalizeSpeciesName(display.scientificName) : false;
    });
    return base.filter((l) => !sizeFilter || l.size_category === sizeFilter);
  }, [allListings, localSpecies, display.scientificName, sizeFilter]);

  const { data: priceSnapshots } = usePriceSnapshots(chartId, sizeFilter, 180);
  const priceData = useMemo(
    () => priceSnapshots.map((ps) => ({ date: ps.snapshot_date, price: ps.median_price_thb, volume: ps.sale_count })),
    [priceSnapshots]
  );

  const fallbackPrice = useMemo(() => {
    if (localSpecies || speciesListings.length === 0) return undefined;
    const prices = speciesListings.map(l => l.price_thb).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  }, [localSpecies, speciesListings]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 pt-24 pb-16">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">{t('common:loading')}</p>
      </div>
    );
  }

  const missing = !localSpecies && !wiki?.gbif && !wiki?.inat && !wiki?.wiki;
  if (missing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center max-w-xl mx-auto">
        <h1 className="text-2xl mb-4">{t('marketplace:species.notFound')}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = searchQuery.trim();
            if (q) navigate(`/species/${encodeURIComponent(q)}`);
          }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('marketplace:species.searchPlaceholder')}
              className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors"
          >
            {t('common:actions.search')}
          </button>
        </form>
        <Link to="/browse" className="text-emerald-400 hover:underline">
          {t('marketplace:species.backToBrowse')}
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('common:actions.back')}
          </Link>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchQuery.trim();
              if (q) navigate(`/species/${encodeURIComponent(q)}`);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('marketplace:species.searchPlaceholder')}
                className="w-full sm:w-64 bg-black border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors"
            >
              {t('common:actions.search')}
            </button>
          </form>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-1 space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-900">
              <img
                src={display.images[selectedImage]}
                alt={display.scientificName}
                className="w-full h-full object-cover"
              />
            </div>
            {display.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {display.images.slice(0, 4).map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square rounded-lg overflow-hidden transition-opacity ${
                      selectedImage === i ? 'ring-2 ring-emerald-400 opacity-100' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            {localSpecies && (
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-zinc-500 capitalize">
                  {t(`marketplace:categories.${display.category}` as const)}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{display.scientificName}</h1>
            {display.commonNameEn && <p className="text-lg text-zinc-400 mb-1">{display.commonNameEn}</p>}
            {display.commonNameTh && <p className="text-sm text-zinc-500 mb-4">{display.commonNameTh}</p>}
            {display.description && <p className="text-zinc-400 leading-relaxed mb-4">{display.description}</p>}
            <div className="flex flex-wrap gap-2 mb-6">
              {display.family && (
                <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{t('marketplace:species.familyLabel', { family: display.family })}</span>
              )}
              {display.genus && (
                <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{t('marketplace:species.genusLabel', { genus: display.genus })}</span>
              )}
              {display.careLevel && (
                <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">
                  {t('marketplace:species.careLevel', { level: display.careLevel })}
                </span>
              )}
              {display.light && (
                <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">
                  {t('marketplace:species.lightRequirement', { light: display.light })}
                </span>
              )}
              {display.synonyms.map(s => (
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
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      sizeFilter === s.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
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
                    {t('marketplace:species.alertDescription', {
                      direction: t(`marketplace:species.alert${a.direction === 'above' ? 'Above' : 'Below'}`),
                      threshold: a.threshold_thb.toLocaleString(),
                      currency: t('common:currency'),
                    })}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deletePriceAlert(a.id);
                        if (user?.id) queryClient.invalidateQueries({ queryKey: userKeys.priceAlerts(user.id) });
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
            <PriceChart data={priceData} height={350} showVolume={true} />
          ) : (
            <div className="py-12 text-center">
              <p className="text-zinc-500">{t('marketplace:species.insufficientData')}</p>
            </div>
          )}
          <div className="mt-6">
            <StatsPanel speciesId={chartId} fallbackPrice={fallbackPrice} />
          </div>
        </div>

        {/* Plant Care Guide */}
        <div className="mb-10">
          <PlantCareCard speciesName={display.scientificName} />
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
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        alertDirection === 'below'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      {t('marketplace:species.alertBelow')}
                    </button>
                    <button
                      onClick={() => setAlertDirection('above')}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        alertDirection === 'above'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
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
                      queryClient.invalidateQueries({ queryKey: userKeys.priceAlerts(user.id) });
                      toast.success(t('marketplace:species.alertSet'));
                      setAlertModalOpen(false);
                      setAlertThreshold('');
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
          <h2 className="text-lg font-medium mb-4">
            {t('marketplace:species.activeListingsCount', { count: speciesListings.length })}
          </h2>
          {speciesListings.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {speciesListings.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  layout="species"
                  sparklineData={Array.from({ length: 20 }, (_, i) => seededRandom(l.id, i) * 50 + l.price_thb * 0.8)}
                />
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
