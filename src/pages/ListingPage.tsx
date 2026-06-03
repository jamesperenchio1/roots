import { useParams, Link } from 'react-router-dom';
import { Heart, Share2, MessageCircle, ShoppingCart, Shield, Truck, MapPin, QrCode } from 'lucide-react';
import { getListingById, getPriceSnapshotsForSpecies, PLANT_IMAGES } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { StatsPanel } from '@/components/PriceChart';
import { Button } from '@/components/ui/button';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const listing = getListingById(id || '');

  if (!listing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">Listing not found</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">Back to browse</Link>
      </div>
    );
  }

  const speciesId = listing.plant_id?.replace('p-', 'sp-') || '';
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
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900">
              <img
                src={PLANT_IMAGES[speciesId] || '/images/plants/monstera-thai.jpg'}
                alt={listing.species?.scientific_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-zinc-800 opacity-50">
                  <img src={PLANT_IMAGES[speciesId] || '/images/plants/monstera-thai.jpg'} alt="" className="w-full h-full object-cover" />
                </div>
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
              <Link to={`/seller/${listing.seller_id}`} className="text-sm text-zinc-500 hover:text-white transition-colors">
                by {listing.seller?.display_name} {listing.seller?.rating && `(${listing.seller.rating})`}
              </Link>
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

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Truck className="w-4 h-4" />
                <span>Delivery: {listing.delivery_options?.join(', ')}</span>
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
              <Button variant="outline" className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5">
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="h-12 px-4 rounded-xl border-white/10 hover:bg-white/5">
                <Share2 className="w-4 h-4" />
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
    </div>
  );
}
