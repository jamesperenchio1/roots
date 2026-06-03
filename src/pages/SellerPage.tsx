import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Store, MapPin, Calendar } from 'lucide-react';
import { getUserById, getActiveListings, PLANT_IMAGES } from '@/data/mockData';

export default function SellerPage() {
  const { id } = useParams<{ id: string }>();
  const seller = getUserById(id || '');
  const listings = getActiveListings().filter(l => l.seller_id === id);

  if (!seller) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">Seller not found</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">Back to browse</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Seller Profile */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-light shrink-0">
              {seller.display_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-tight mb-1">{seller.display_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mb-3">
                {seller.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {seller.location}</span>}
                {seller.rating && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> {seller.rating}</span>}
                <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5" /> {seller.sales_count} sales</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Member since {new Date(seller.created_at).getFullYear()}</span>
              </div>
              <p className="text-sm text-zinc-400">
                Trusted seller with {seller.sales_count}+ completed transactions and a {seller.rating} rating.
              </p>
            </div>
          </div>
        </div>

        {/* Active Listings */}
        <h2 className="text-lg font-medium mb-4">Active Listings ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(l => (
              <Link to={`/listing/${l.id}`} key={l.id} className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all group">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={PLANT_IMAGES[l.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-zinc-500 mb-1 truncate">{l.species?.scientific_name}</p>
                  <p className="font-medium mb-2 truncate">{l.species?.common_name_en}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold">{l.price_thb.toLocaleString()} THB</span>
                    <span className="text-xs text-zinc-600">{l.size_category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No active listings from this seller.</p>
        )}
      </div>
    </div>
  );
}
