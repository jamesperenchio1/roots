import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ShoppingCart, Shield, Truck, MapPin, QrCode, Tag, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import PlantCareCard from '@/components/PlantCareCard';
import WeatherWidget from '@/components/WeatherWidget';
import { PROVINCE_CITIES } from '@/lib/weather';
import { getProvinceLabel } from '@/lib/provinces';
import { toast } from 'sonner';
import { getListingById, getPriceSnapshotsForSpecies, PLANT_IMAGES } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toggleWatch, getOrCreateThreadId, fetchPlant } from '@/lib/api';
import ReviewSection from '@/components/ReviewSection';
import { generateQR } from '@/lib/promptpay';
import MakeOfferModal from '@/components/MakeOfferModal';
import ShareButtons from '@/components/ShareButtons';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import ProvenanceInfo from '@/components/ProvenanceInfo';
import { getSrcSet, RESPONSIVE_WIDTHS, HERO_SIZES } from '@/lib/images';

export default function ListingPage() {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const { id } = useParams<{ id: string }>();
  const listing = getListingById(id || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watched, setWatched] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const { recordView } = useRecentlyViewed();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (listing) {
      const plantId = listing.plant_id || listing.id;
      fetchPlant(plantId).then((plant) => {
        const signature = plant?.qr_signature || '';
        const url = `${window.location.origin}/#/p/${plantId}${signature ? `?s=${signature}` : ''}`;
        generateQR(url, 400).then(setQrUrl).catch(() => setQrUrl(''));
      }).catch(() => {
        generateQR(`${window.location.origin}/#/p/${plantId}`, 400).then(setQrUrl).catch(() => setQrUrl(''));
      });
      recordView(listing.id);
    }
  }, [listing, id, recordView]);

  const handleWatch = async () => {
    if (!user) { toast.info(t('marketplace:listing.loginToWatch')); return; }
    const next = !watched;
    setWatched(next);
    try {
      await toggleWatch(user.id, 'listing', id || '', next);
      toast.success(next ? t('marketplace:listing.addedToWatchlist') : t('marketplace:listing.removedFromWatchlist'));
    } catch {
      setWatched(!next);
      toast.error(t('marketplace:listing.watchlistError'));
    }
  };

  const handleMessage = () => {
    if (!user) { toast.info(t('marketplace:listing.loginToMessage')); return; }
    if (!listing?.seller_id) { toast.error(t('marketplace:listing.sellerUnavailable')); return; }
    if (listing.seller_id === user.id) { toast.info(t('marketplace:listing.ownListing')); return; }
    const threadId = getOrCreateThreadId(user.id, listing.seller_id, listing.id);
    navigate(`/messages/${threadId}`);
  };

  if (!listing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">{t('marketplace:listing.notFound')}</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">{t('marketplace:listing.backToBrowse')}</Link>
      </div>
    );
  }

  const speciesId = listing.plant_id?.replace('p-', 'sp-') || '';
  const plantPhotos = listing.photos && listing.photos.length
    ? [...new Set(listing.photos.map(p => p.storage_path))]
    : [PLANT_IMAGES[speciesId] || '/images/plants/monstera-thai.jpg'];
  const gallery = plantPhotos;
  const mainImage = gallery[activeImage] || gallery[0] || '';
  const showNav = gallery.length > 1;
  const goTo = (i: number) => setActiveImage((i + gallery.length) % gallery.length);
  const goNext = () => goTo(activeImage + 1);
  const goPrev = () => goTo(activeImage - 1);
  const priceData = (() => {
    const snapshots = getPriceSnapshotsForSpecies(speciesId, listing.size_category, 90).map(ps => ({
      date: ps.snapshot_date,
      price: ps.median_price_thb,
      volume: ps.sale_count
    }));
    if (snapshots.length > 0) return snapshots;

    // No market history yet — draw a line from the listing price so the
    // chart is never empty on a real product page. Falls back to 0 when
    // price is missing.
    const price = listing.price_thb ?? 0;
    const today = new Date();
    const created = listing.created_at ? new Date(listing.created_at) : today;
    // Ensure at least two days so Recharts draws a visible line.
    if (created.toDateString() === today.toDateString()) {
      created.setDate(today.getDate() - 1);
    }
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const synthetic: { date: string; price: number; volume: number }[] = [];
    for (let d = new Date(created); d <= today; d.setDate(d.getDate() + 1)) {
      synthetic.push({ date: fmt(new Date(d)), price, volume: 0 });
    }
    return synthetic;
  })();

  const median30d = priceData.length > 0
    ? priceData.slice(-30).reduce((s, d) => s + d.price, 0) / Math.min(30, priceData.length)
    : listing.price_thb;
  const pctDiff = ((listing.price_thb - median30d) / median30d * 100).toFixed(1);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Image */}
          <div className="space-y-4">
            <div className="group aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 relative">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block w-full h-full cursor-zoom-in"
                aria-label={t('marketplace:listing.openFullImage')}
              >
                <img
                  src={mainImage}
                  srcSet={getSrcSet(mainImage, { widths: RESPONSIVE_WIDTHS, resize: 'cover' })}
                  sizes={HERO_SIZES}
                  alt={listing.species?.scientific_name || t('marketplace:browse.listingAlt')}
                  className="w-full h-full object-cover"
                />
              </button>
              <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1.5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <ZoomIn className="w-4 h-4" />
              </span>
              {showNav && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label={t('marketplace:listing.previousImage')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label={t('marketplace:listing.nextImage')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] text-white/90">
                    {activeImage + 1} / {gallery.length}
                  </div>
                </>
              )}

            </div>
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-zinc-800 transition-all ${activeImage === i ? 'ring-2 ring-emerald-500 opacity-100' : 'opacity-70 hover:opacity-100'}`}
                >
                  <img src={src} srcSet={getSrcSet(src, { widths: [96, 192, 384], resize: 'cover' })} sizes="96px" alt={t('marketplace:listing.galleryImage', { number: i + 1 })} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <Link to={`/species/${speciesId}`} className="text-sm text-emerald-400 hover:underline mb-1 block">
                {listing.species?.scientific_name}
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-light tracking-tight">
                  {listing.species?.common_name_en || listing.species?.common_name_th}
                </h1>
                {listing.status !== 'active' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {listing.status === 'pending_review' ? 'Pending review' : listing.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                {listing.species?.common_name_th && `${listing.species.common_name_th} · `}
                {listing.species?.scientific_name}
              </p>
              <div className="flex items-center justify-between">
                <Link to={`/seller/${listing.seller_id}`} className="text-sm text-zinc-500 hover:text-white transition-colors">
                  {t('marketplace:listing.bySeller', { name: listing.seller?.display_name, rating: listing.seller?.rating ? `(${listing.seller.rating})` : '' })}
                </Link>
                <ShareButtons
                  title={t('marketplace:listing.shareTitle', { name: listing.species?.common_name_en || t('marketplace:browse.listingAlt') })}
                  url={typeof window !== 'undefined' ? window.location.href : ''}
                  description={listing.description}
                />
              </div>

              {listing.seller_id && (
                <div className="mt-4">
                  <ReviewSection sellerId={listing.seller_id} compact />
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold">{listing.price_thb.toLocaleString()} {t('common:currency')}</span>
              <span
                title={t('marketplace:listing.medianTooltip')}
                className={`text-sm cursor-help ${parseFloat(pctDiff) > 0 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {t('marketplace:listing.vsMedian', { value: `${parseFloat(pctDiff) > 0 ? '+' : ''}${pctDiff}` })}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{t('marketplace:listing.sizeLabel', { size: listing.size_category })}</span>
              {listing.size_cm_range && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.size_cm_range}</span>}
              {listing.pot_size_cm && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{t('marketplace:listing.potSize', { size: listing.pot_size_cm })}</span>}
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.species?.category}</span>
              {listing.tags?.map(t => (
                <span key={t} className="bg-emerald-500/10 px-3 py-1 rounded-full text-xs text-emerald-400">{t}</span>
              ))}
            </div>

            <p className="text-zinc-400 leading-relaxed">{listing.description}</p>

            <PlantCareCard speciesName={listing.species?.scientific_name || listing.species?.common_name_en || ''} compact />

            {listing.pickup_province && (
              <WeatherWidget
                cityName={PROVINCE_CITIES[listing.pickup_province] ?? listing.pickup_province}
                compact
              />
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Truck className="w-4 h-4" />
                <span>
                  {t('marketplace:listing.deliveryLabel', { options: listing.delivery_options?.map(opt =>
                    opt === 'ship' ? t('marketplace:listing.shipping') :
                    opt === 'pickup' ? t('marketplace:listing.pickup') : opt
                  ).join(', ') })}
                  {listing.delivery_options?.includes('ship') && (
                    <span className="text-emerald-400 ml-1">
                      ({(listing.shipping_cost_thb ?? 0) === 0 ? t('marketplace:listing.freeShipping') : t('marketplace:listing.shippingCost', { cost: listing.shipping_cost_thb, currency: t('common:currency') })})
                    </span>
                  )}
                </span>
              </div>
              {listing.pickup_province && (
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>
                    {t('marketplace:listing.pickupLabel', { province: getProvinceLabel(listing.pickup_province, i18n.language) })}
                    {listing.pickup_location && <span className="text-zinc-500"> · {listing.pickup_location}</span>}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Shield className="w-4 h-4" />
                <span>{t('marketplace:listing.escrowProtected')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <QrCode className="w-4 h-4" />
                <span>{t('marketplace:listing.qrTag')}</span>
                <ProvenanceInfo />
              </div>
            </div>

            {qrUrl && (
              <Link
                to={`/p/${listing.plant_id || listing.id}`}
                className="flex items-center gap-3 bg-zinc-900/30 border border-white/5 rounded-xl p-3 hover:border-white/15 transition-colors"
              >
                <div className="w-16 h-16 bg-white rounded-lg p-1.5 shrink-0">
                  <img
                    src={qrUrl}
                    alt={t('marketplace:listing.verifiedProvenance')}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t('marketplace:listing.verifiedProvenance')}</p>
                  <p className="text-xs text-zinc-500">{t('marketplace:listing.scanQrCta')}</p>
                </div>
              </Link>
            )}

            <div className="flex gap-3 pt-4">
              {listing.status === 'active' ? (
                <Link to={`/checkout/${listing.id}`} className="flex-1">
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {t('marketplace:listing.buy')}
                  </Button>
                </Link>
              ) : (
                <div className="flex-1">
                  <Button disabled className="w-full h-12 rounded-xl bg-zinc-800 text-zinc-500 cursor-not-allowed">
                    {listing.status === 'pending_review' ? 'Under review' : 'Not available'}
                  </Button>
                </div>
              )}
              {listing.status === 'active' && user && user.id !== listing.seller_id && (
                <Button
                  type="button"
                  onClick={() => setOfferModalOpen(true)}
                  variant="outline"
                  className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  {t('marketplace:listing.makeOffer')}
                </Button>
              )}
              <Button type="button" onClick={handleWatch} variant="outline" className={`h-12 px-4 rounded-xl border-white/10 hover:bg-white/5 ${watched ? 'text-rose-400' : ''}`}>
                <Heart className={`w-4 h-4 ${watched ? 'fill-rose-400' : ''}`} />
              </Button>
              <Button type="button" onClick={handleMessage} variant="outline" className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Price History */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-1">{t('marketplace:listing.priceHistory')}</h2>
          <p className="text-sm text-zinc-500 mb-4">
            {t('marketplace:listing.priceHistoryDescription', { species: listing.species?.scientific_name, size: listing.size_category })}
          </p>
          <PriceChart data={priceData} height={300} showVolume={true} />
          <div className="mt-6">
            <StatsPanel speciesId={speciesId} fallbackPrice={listing.price_thb} />
          </div>
        </div>
      </div>

      {listing && (
        <MakeOfferModal
          listing={listing}
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          onSubmitted={() => {}}
        />
      )}

      {lightboxOpen && (
        <div
          ref={(el) => el?.focus()}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            else if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
          }}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm outline-none"
          aria-modal="true"
          role="dialog"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label={t('common:actions.close')}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={mainImage}
            srcSet={getSrcSet(mainImage, { widths: RESPONSIVE_WIDTHS, resize: 'contain' })}
            sizes={HERO_SIZES}
            alt={listing?.species?.scientific_name || t('marketplace:browse.listingAlt')}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg"
          />
          {showNav && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label={t('marketplace:listing.previousImage')}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label={t('marketplace:listing.nextImage')}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/10 rounded-full px-3 py-1 text-sm text-white/90">
                {activeImage + 1} / {gallery.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
