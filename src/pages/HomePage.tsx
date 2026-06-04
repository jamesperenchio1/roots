import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Shield, Search, CreditCard, Clock } from 'lucide-react';
import { getActiveListings, getMarketOverview, getPriceSnapshotsForSpecies, PLANT_IMAGES, getListingById } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { LazyImage } from '@/components/LazyImage';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export default function HomePage() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const listings = getActiveListings().slice(0, 8);
  const market = getMarketOverview();
  const { getRecentlyViewed } = useRecentlyViewed();
  const recentlyViewedIds = getRecentlyViewed().slice(0, 4);
  const recentlyViewed = recentlyViewedIds.map(id => getListingById(id)).filter(Boolean);

  const thaiConstellationData = getPriceSnapshotsForSpecies('sp-1', undefined, 90).map(ps => ({
    date: ps.snapshot_date,
    price: ps.median_price_thb,
  }));
  const fallbackChartData = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (30 - i));
      return { date: d.toISOString().split('T')[0], price: 4000 + Math.sin(i / 5) * 1000 + ((i * 37) % 100 - 50) };
    }),
    []
  );
  const chartData = thaiConstellationData.length > 0 ? thaiConstellationData : fallbackChartData;

  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className={`absolute right-0 top-0 w-full lg:w-[60%] h-full transition-all duration-1500 ease-out ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
          <img src="/images/hero.jpg" alt="Plants" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20">
          <div className="max-w-2xl">
            <div className={`transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight mb-6 leading-[1.05]">
                Buy plants.
                <br />
                <span className="text-emerald-400">Sell plants.</span>
                <br />
                Simple.
              </h1>
            </div>
            <div className={`transition-all duration-1000 delay-500 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-lg text-zinc-400 mb-4 max-w-md leading-relaxed">
                Thailand's plant marketplace — from a 20-baht basil cutting to a 20,000-baht
                variegated monstera. Whatever you're growing, someone here wants it.
              </p>
              <p className="text-sm text-zinc-500 mb-8 max-w-sm">
                See price history before you buy. Sell with a permanent QR tag
                that tracks your plant's story. PromptPay checkout. 8% seller fee.
              </p>
            </div>
            <div className={`flex flex-wrap gap-4 transition-all duration-1000 delay-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link to="/browse" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition-all">
                Browse Plants
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/market" className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white/5 transition-all">
                <TrendingUp className="w-4 h-4" />
                Market Prices
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="pt-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">Recently Viewed</h2>
                <p className="text-zinc-500">Pick up where you left off</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentlyViewed.map(listing => (
                <Link to={`/listing/${listing!.id}`} key={listing!.id} className="group bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all hover:-translate-y-1">
                  <LazyImage
                    src={listing!.photos?.[0]?.storage_path || PLANT_IMAGES[listing!.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'}
                    alt={listing!.species?.scientific_name || 'Plant listing'}
                    aspectRatio="3/4"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4">
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                      <Clock className="w-3 h-3" /> Recently viewed
                    </div>
                    <p className="font-medium text-white mb-1 truncate">{listing!.species?.common_name_en || listing!.species?.common_name_th}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-semibold">{listing!.price_thb.toLocaleString()} THB</span>
                      <span className="text-xs text-zinc-600">{listing!.size_category}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">Fresh Listings</h2>
              <p className="text-zinc-500">Recently posted plants from sellers across Thailand</p>
            </div>
            <Link to="/browse" className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(listing => (
              <Link to={`/listing/${listing.id}`} key={listing.id} className="group bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all hover:-translate-y-1">
                <LazyImage
                  src={listing.photos?.[0]?.storage_path || PLANT_IMAGES[listing.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'}
                  alt={listing.species?.scientific_name || 'Plant listing'}
                  aspectRatio="3/4"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="p-4">
                  <p className="text-xs text-zinc-500 mb-1 truncate">{listing.species?.scientific_name}</p>
                  <p className="font-medium text-white mb-1 truncate">{listing.species?.common_name_en || listing.species?.common_name_th}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold">{listing.price_thb.toLocaleString()} THB</span>
                    <span className="text-xs text-zinc-600">{listing.size_category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Market Pulse */}
      <section className="py-20 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">Market Pulse</h2>
              <p className="text-zinc-500">What is moving right now</p>
            </div>
            <Link to="/market" className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Full Market <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Trending Up
              </h3>
              <div className="space-y-3">
                {(market.trending_up.length > 0 ? market.trending_up.slice(0, 4) : [
                  { species: { id: 's1', scientific_name: 'Philodendron gloriosum', common_name_en: 'Gloriosum', common_name_th: '' }, current_median: 5200, previous_median: 4570, percent_change: 13.7, sales_count: 12, sparkline_data: [] },
                  { species: { id: 's2', scientific_name: 'Anthurium clarinervium', common_name_en: 'Velvet Cardboard', common_name_th: '' }, current_median: 1850, previous_median: 1647, percent_change: 12.3, sales_count: 18, sparkline_data: [] },
                  { species: { id: 's3', scientific_name: 'Pink Princess', common_name_en: 'Pink Princess', common_name_th: '' }, current_median: 3850, previous_median: 3481, percent_change: 10.6, sales_count: 24, sparkline_data: [] },
                  { species: { id: 's4', scientific_name: 'Crystal Anthurium', common_name_en: 'Crystal Anthurium', common_name_th: '' }, current_median: 6200, previous_median: 5678, percent_change: 9.2, sales_count: 9, sparkline_data: [] },
                ]).map((item: any) => (
                  <Link to={`/species/${item.species.id}`} key={item.species.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-medium">{item.species.scientific_name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium group-hover:text-emerald-400 transition-colors">{item.species.common_name_en || item.species.scientific_name.split(' ').slice(0, 2).join(' ')}</p>
                        <p className="text-xs text-zinc-500">{item.sales_count} sales</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round(item.current_median).toLocaleString()} THB</p>
                      <p className="text-xs text-emerald-400">+{item.percent_change.toFixed(1)}%</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Price History — Monstera Thai Constellation</h3>
              <PriceChart data={chartData} height={200} showArea={true} />
              <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
                <span>90-day median: {chartData.length > 0 ? Math.round(chartData[chartData.length - 1].price).toLocaleString() : '0'} THB</span>
                <span className="text-emerald-400">Live data</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-3">How it works</h2>
            <p className="text-zinc-500">Three steps. No complications.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'Find what you want', desc: 'Browse herbs, houseplants, cacti, orchids — whatever. Check the price history graph to see if the asking price is fair. Message the seller if you have questions.' },
              { icon: CreditCard, title: 'Pay with PromptPay', desc: 'Checkout with your banking app. Your money stays in escrow — the seller does not get it until you confirm the plant arrived healthy. Protected on both sides.' },
              { icon: Shield, title: 'Scan the QR tag', desc: 'When your plant arrives, scan the QR code on the pot to verify it matches the listing. Upload a quick photo, confirm receipt, and the seller gets paid. Done.' },
            ].map((step, i) => (
              <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-medium mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-3">Got a plant to sell?</h2>
          <p className="text-zinc-500 mb-8">
            List it in under 2 minutes. We will generate a QR tag so buyers can verify it.
            You only pay when it sells.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors">
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/seller-dashboard/listings/new" className="inline-flex items-center gap-2 border border-white/20 text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-white/5 transition-colors">
              List a Plant
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
