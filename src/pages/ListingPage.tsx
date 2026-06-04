import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, ShoppingCart, Shield, Truck, MapPin, QrCode, Tag } from 'lucide-react';
import PlantCareCard from '@/components/PlantCareCard';
import WeatherWidget from '@/components/WeatherWidget';
import { PROVINCE_CITIES } from '@/lib/weather';
import { toast } from 'sonner';
import { getListingById, getPriceSnapshotsForSpecies, PLANT_IMAGES } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toggleWatch } from '@/lib/api';
import ReviewSection from '@/components/ReviewSection';
import { generateQR } from '@/lib/promptpay';
import MakeOfferModal from '@/components/MakeOfferModal';
import ShareButtons from '@/components/ShareButtons';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const listing = getListingById(id || '');
  const { user } = useAuth();
  const [watched, setWatched] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [activeImage, setActiveImage] = useState(1); // default to plant photo (index 1) if available
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const { recordView } = useRecentlyViewed();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (listing) {
      const plantId = listing.plant_id || listing.id;
      generateQR(`${window.location.origin}/#/p/${plantId}`, 400).then(setQrUrl).catch(() => setQrUrl(''));
      recordView(listing.id);
    }
  }, [listing, id, recordView]);

  const handleWatch = async () => {
    if (!user) { toast.info('Log in to save plants to your watchlist.'); return; }
    const next = !watched;
    setWatched(next);
    try {
      await toggleWatch(user.id, 'listing', id || '', next);
      toast.success(next ? 'Added to your watchlist' : 'Removed from watchlist');
    } catch {
      setWatched(!next);
      toast.error('Could not update watchlist');
    }
  };

  const handleMessage = () => {
    if (!user) { toast.info('Log in to message the seller.'); return; }
    toast.success(`Your interest was sent to ${listing?.seller?.display_name || 'the seller'}.`);
  };

  if (!listing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">Listing not found</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">Back to browse</Link>
      </div>
    );
  }

  const speciesId = listing.plant_id?.replace('p-', 'sp-') || '';
  const plantPhotos = listing.photos && listing.photos.length
    ? [...new Set(listing.photos.map(p => p.storage_path))]
    : [PLANT_IMAGES[speciesId] || '/images/plants/monstera-thai.jpg'];
  const gallery = qrUrl ? [qrUrl, ...plantPhotos] : plantPhotos;
  const mainImage = gallery[activeImage] || gallery[0] || '';
  const priceData = getPriceSnapshotsForSpecies(speciesId, listing.size_category, 90).map(ps => ({
    date: ps.snapshot_date,
    price: ps.median_price_thb,
    volume: ps.sale_count
  }));

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
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 relative">
              <img
                src={mainImage}
                alt={listing.species?.scientific_name || 'Plant listing'}
                className="w-full h-full object-cover"
              />
              {activeImage === 0 && qrUrl && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-purple-300 font-medium">Verified Provenance — Scan to check history</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(0, 4).map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-zinc-800 transition-all ${activeImage === i ? 'ring-2 ring-emerald-500 opacity-100' : 'opacity-70 hover:opacity-100'}`}
                >
                  <img src={src} alt={`Gallery image ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  {i === 0 && qrUrl && (
                    <span className="absolute bottom-1 left-1 bg-purple-500/80 text-[9px] text-white px-1 rounded">QR</span>
                  )}
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
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight mb-2">
                {listing.species?.common_name_en || listing.species?.common_name_th}
              </h1>
              <p className="text-sm text-zinc-500 mb-3">
                {listing.species?.common_name_th && `${listing.species.common_name_th} · `}
                {listing.species?.scientific_name}
              </p>
              <div className="flex items-center justify-between">
                <Link to={`/seller/${listing.seller_id}`} className="text-sm text-zinc-500 hover:text-white transition-colors">
                  by {listing.seller?.display_name} {listing.seller?.rating ? `(${listing.seller.rating})` : ''}
                </Link>
                <ShareButtons
                  title={`${listing.species?.common_name_en || 'Plant listing'} on Root`}
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
              <span className="text-3xl font-semibold">{listing.price_thb.toLocaleString()} THB</span>
              <span className={`text-sm ${parseFloat(pctDiff) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {parseFloat(pctDiff) > 0 ? '+' : ''}{pctDiff}% vs 30d median
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.size_category} size</span>
              {listing.size_cm_range && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.size_cm_range}</span>}
              {listing.pot_size_cm && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.pot_size_cm}cm pot</span>}
              <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.species?.category}</span>
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
                  Delivery: {listing.delivery_options?.join(', ')}
                  {listing.delivery_options?.includes('ship') && (
                    <span className="text-emerald-400 ml-1">
                      ({listing.shipping_cost_thb === 0 ? 'Free' : `${listing.shipping_cost_thb} THB`} shipping)
                    </span>
                  )}
                </span>
              </div>
              {listing.pickup_province && (
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <MapPin className="w-4 h-4" />
                  <span>Pickup: {listing.pickup_province}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Shield className="w-4 h-4" />
                <span>Escrow protected — funds released after delivery confirmation</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <QrCode className="w-4 h-4" />
                <span>Comes with QR provenance tag</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Link to={`/checkout/${listing.id}`} className="flex-1">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Now
                </Button>
              </Link>
              {listing.status === 'active' && user && user.id !== listing.seller_id && (
                <Button
                  type="button"
                  onClick={() => setOfferModalOpen(true)}
                  variant="outline"
                  className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Make Offer
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
          <h2 className="text-lg font-medium mb-1">Price History</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Historical sales data for {listing.species?.scientific_name} — {listing.size_category} size
          </p>
          <PriceChart data={priceData} height={300} showVolume={true} />
          <div className="mt-6">
            <StatsPanel speciesId={speciesId} />
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
    </div>
  );
}
