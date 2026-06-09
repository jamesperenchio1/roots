import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, ShoppingCart, Shield, Truck, MapPin, QrCode, Tag, Info, Sprout, Droplets, Sun } from 'lucide-react';
import PlantCareCard from '@/components/PlantCareCard';
import WeatherWidget from '@/components/WeatherWidget';
import { PROVINCE_CITIES } from '@/lib/weather';
import { toast } from 'sonner';
import { getListingById, getPriceSnapshotsForSpecies, PLANT_IMAGES, USERS } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toggleWatch, fetchProvenance, getOrCreateThreadId, sendMessage, createNotification } from '@/lib/api';
import ReviewSection from '@/components/ReviewSection';
import { generateQR } from '@/lib/promptpay';
import MakeOfferModal from '@/components/MakeOfferModal';
import ShareButtons from '@/components/ShareButtons';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import type { Transfer } from '@/types';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const listing = getListingById(id || '');
  const { user } = useAuth();
  const [watched, setWatched] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [activeImage, setActiveImage] = useState(1); // default to plant photo (index 1) if available
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const { recordView } = useRecentlyViewed();
  const [provenanceEvents, setProvenanceEvents] = useState<{ date: string; event: string; from: string | null; to: string | null; price: number | null; type: 'origin' | 'sale' | 'current' }[]>([]);
  const [showProvenance, setShowProvenance] = useState(false);
  const [showQrTooltip, setShowQrTooltip] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (listing) {
      const plantId = listing.plant_id || listing.id;
      generateQR(`${window.location.origin}/#/p/${plantId}`, 400).then(setQrUrl).catch(() => setQrUrl(''));
      recordView(listing.id);

      // Fetch provenance
      fetchProvenance(plantId).then(({ transfers }) => {
        const events: typeof provenanceEvents = [];
        if (transfers.length === 0) {
          events.push({
            date: listing.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            event: 'Plant registered',
            from: null,
            to: listing.seller?.display_name || 'Current Owner',
            price: null,
            type: 'origin',
          });
          events.push({
            date: new Date().toISOString().slice(0, 10),
            event: 'Current ownership',
            from: null,
            to: listing.seller?.display_name || 'Current Owner',
            price: null,
            type: 'current',
          });
        } else {
          transfers.forEach((tr: Transfer, i: number) => {
            const fromUser = tr.from_user_id ? USERS.find(u => u.id === tr.from_user_id) : null;
            const toUser = tr.to_user_id ? USERS.find(u => u.id === tr.to_user_id) : null;
            if (i === 0 && !tr.from_user_id) {
              events.push({
                date: tr.transferred_at.slice(0, 10),
                event: 'Plant registered',
                from: null,
                to: toUser?.display_name || 'Unknown',
                price: null,
                type: 'origin',
              });
            } else {
              events.push({
                date: tr.transferred_at.slice(0, 10),
                event: tr.sale_price_thb ? 'Sale' : 'Transfer',
                from: fromUser?.display_name || 'Unknown',
                to: toUser?.display_name || 'Unknown',
                price: tr.sale_price_thb || null,
                type: 'sale',
              });
            }
          });
          const last = transfers[transfers.length - 1];
          const lastOwner = last.to_user_id ? USERS.find(u => u.id === last.to_user_id) : null;
          events.push({
            date: new Date().toISOString().slice(0, 10),
            event: 'Current ownership',
            from: lastOwner?.display_name || 'Unknown',
            to: lastOwner?.display_name || 'Unknown',
            price: null,
            type: 'current',
          });
        }
        setProvenanceEvents(events);
      });
    }
  }, [listing, id, recordView]);

  const handleWatch = async () => {
    if (!user) { toast.info('Log in to save plants to your watchlist.'); return; }
    const next = !watched;
    setWatched(next);
    try {
      await toggleWatch(user.id, 'listing', id || '', next);
      if (next && listing?.seller_id && listing.seller_id !== user.id) {
        // Notify seller someone is watching their listing
        createNotification({
          user_id: listing.seller_id,
          type: 'system',
          title: 'Someone is watching your listing',
          message: `${user.display_name} added your ${listing.species?.common_name_en || 'plant'} to their watchlist`,
          link: `/listing/${listing.id}`,
          read: false,
        }).catch(() => {});
      }
      toast.success(next ? 'Added to your watchlist' : 'Removed from watchlist');
    } catch {
      setWatched(!next);
      toast.error('Could not update watchlist');
    }
  };

  const handleMessage = async () => {
    if (!user) { toast.info('Log in to message the seller.'); return; }
    if (!listing?.seller_id || listing.seller_id === user.id) {
      toast.info('You cannot message yourself.');
      return;
    }
    const threadId = getOrCreateThreadId(user.id, listing.seller_id, listing.id);
    // Send an initial interest message
    try {
      await sendMessage({
        thread_id: threadId,
        sender_id: user.id,
        recipient_id: listing.seller_id,
        listing_id: listing.id,
        content: `Hi! I'm interested in your ${listing.species?.common_name_en || 'plant listing'}. Is it still available?`,
        flagged_contact_info: false,
      });
      toast.success(`Chat started with ${listing.seller?.display_name || 'the seller'}`);
      window.location.href = `/#/messages/${threadId}`;
    } catch {
      toast.error('Could not start chat');
    }
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

  const qualities = listing.display_qualities || ['size','pot','category','care','water','light'];
  const showSize = qualities.includes('size');
  const showPot = qualities.includes('pot');
  const showCategory = qualities.includes('category');
  const showCare = qualities.includes('care');
  const showWater = qualities.includes('water');
  const showLight = qualities.includes('light');

  const displayTitle = listing.custom_name || listing.species?.common_name_en || listing.species?.common_name_th || 'Plant';

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
                {displayTitle}
              </h1>
              {listing.custom_name && (
                <p className="text-sm text-zinc-500 mb-1">
                  {listing.species?.common_name_en || listing.species?.common_name_th}
                </p>
              )}
              <p className="text-sm text-zinc-500 mb-3">
                {listing.species?.common_name_th && !listing.custom_name ? `${listing.species.common_name_th} · ` : ''}
                {listing.species?.scientific_name}
              </p>
              <div className="flex items-center justify-between">
                <Link to={`/seller/${listing.seller_id}`} className="text-sm text-zinc-500 hover:text-white transition-colors">
                  by {listing.seller?.display_name} {listing.seller?.rating ? `(${listing.seller.rating})` : ''}
                </Link>
                <ShareButtons
                  title={`${displayTitle} on Root`}
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
              <span
                title="Median is the middle price of all recent sales — more reliable than average because it is not skewed by one unusually cheap or expensive sale."
                className={`text-sm cursor-help ${parseFloat(pctDiff) > 0 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {parseFloat(pctDiff) > 0 ? '+' : ''}{pctDiff}% vs 30d median
              </span>
            </div>

            {/* Physical attributes */}
            <div className="flex flex-wrap gap-2">
              {showSize && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.size_category} size</span>}
              {showPot && listing.size_cm_range && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.size_cm_range}</span>}
              {showPot && listing.pot_size_cm && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.pot_size_cm}cm pot</span>}
              {showCategory && <span className="bg-zinc-800/50 px-3 py-1 rounded-full text-xs">{listing.species?.category}</span>}
              {listing.tags?.map(t => (
                <span key={t} className="bg-emerald-500/10 px-3 py-1 rounded-full text-xs text-emerald-400">{t}</span>
              ))}
            </div>

            <p className="text-zinc-400 leading-relaxed">{listing.description}</p>

            {/* Care info - filtered by seller preferences */}
            {(showCare || showWater || showLight) && (
              <div className="flex flex-wrap gap-2">
                {showCare && (
                  <span className="inline-flex items-center gap-1 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs text-zinc-300">
                    <Sprout className="w-3 h-3 text-emerald-400" />
                    {listing.species?.care_level || 'Moderate'}
                  </span>
                )}
                {showWater && (
                  <span className="inline-flex items-center gap-1 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs text-zinc-300">
                    <Droplets className="w-3 h-3 text-sky-400" />
                    Average
                  </span>
                )}
                {showLight && (
                  <span className="inline-flex items-center gap-1 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs text-zinc-300">
                    <Sun className="w-3 h-3 text-amber-400" />
                    {listing.species?.light_requirement || 'Bright indirect'}
                  </span>
                )}
              </div>
            )}

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
                      ({(listing.shipping_cost_thb ?? 0) === 0 ? 'Free' : `${listing.shipping_cost_thb} THB`} shipping)
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
              {listing.pickup_address && (
                <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-emerald-400 font-medium mb-0.5">Pickup Address</p>
                      <p className="text-sm text-zinc-300">{listing.pickup_address}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Shield className="w-4 h-4" />
                <span>Escrow protected — funds released after delivery confirmation</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400 relative">
                <QrCode className="w-4 h-4" />
                <span>Comes with QR provenance tag</span>
                <button
                  type="button"
                  onClick={() => setShowQrTooltip(!showQrTooltip)}
                  className="text-emerald-400 hover:text-emerald-300 text-xs inline-flex items-center gap-0.5"
                >
                  <Info className="w-3 h-3" /> What is this?
                </button>
                {showQrTooltip && (
                  <div className="absolute left-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl p-4 shadow-xl z-20 max-w-sm">
                    <p className="text-sm text-zinc-300 leading-relaxed mb-2">
                      Every plant sold on Root receives a unique QR code — a digital birth certificate
                      that stays with the plant for life.
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Scanning this QR reveals the plant's full history: who grew it, when it was sold,
                      and every owner since. It creates trust in the second-hand plant market and helps
                      rare plants retain their provenance value across multiple owners.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Verified ownership</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Fraud protection</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Resale value</span>
                    </div>
                    <button
                      onClick={() => setShowQrTooltip(false)}
                      className="absolute top-2 right-2 text-zinc-500 hover:text-white"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  </div>
                )}
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

        {/* Provenance History */}
        {provenanceEvents.length > 0 && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Plant History</h2>
              <Link to={`/p/${listing.plant_id || listing.id}`} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <QrCode className="w-3 h-3" /> Full Provenance Page
              </Link>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
              <div className="space-y-4">
                {provenanceEvents.slice(-3).map((entry, i) => (
                  <div key={i} className="relative pl-12">
                    <div className={`absolute left-3 w-2.5 h-2.5 rounded-full border-2 ${entry.type === 'origin' ? 'bg-emerald-500 border-emerald-500' : entry.type === 'current' ? 'bg-purple-500 border-purple-500' : 'bg-white border-white'}`} />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{entry.event}</span>
                      <span className="text-xs text-zinc-500">{entry.date}</span>
                    </div>
                    {entry.to && entry.type !== 'current' && (
                      <p className="text-xs text-zinc-500">To: {entry.to}</p>
                    )}
                    {entry.price && <p className="text-xs text-emerald-400">{entry.price.toLocaleString()} THB</p>}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowProvenance(!showProvenance)}
              className="text-xs text-zinc-500 hover:text-white mt-3 transition-colors"
            >
              {showProvenance ? 'Show less' : `Show all ${provenanceEvents.length} entries`}
            </button>
            {showProvenance && (
              <div className="relative mt-4">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
                <div className="space-y-4">
                  {provenanceEvents.map((entry, i) => (
                    <div key={i} className="relative pl-12">
                      <div className={`absolute left-3 w-2.5 h-2.5 rounded-full border-2 ${entry.type === 'origin' ? 'bg-emerald-500 border-emerald-500' : entry.type === 'current' ? 'bg-purple-500 border-purple-500' : 'bg-white border-white'}`} />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{entry.event}</span>
                        <span className="text-xs text-zinc-500">{entry.date}</span>
                      </div>
                      {entry.from && <p className="text-xs text-zinc-500">From: {entry.from}</p>}
                      {entry.to && <p className="text-xs text-zinc-500">To: {entry.to}</p>}
                      {entry.price && <p className="text-xs text-emerald-400">{entry.price.toLocaleString()} THB</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
