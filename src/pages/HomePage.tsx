import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, TrendingUp, Search, Clock } from 'lucide-react';
import { useListings } from '@/hooks/queries/useListings';
import { useMarketOverview } from '@/hooks/queries/useMarketOverview';
import { usePriceSnapshots } from '@/hooks/queries/usePriceSnapshots';
import { LazyPriceChart } from '@/components/LazyPriceChart';
import { ListingCard } from '@/components/ListingCard';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export default function HomePage() {
  const { t } = useTranslation(['home', 'common', 'marketplace']);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const { data: listingsData } = useListings();
  const listings = useMemo(() => (listingsData ?? []).slice(0, 8), [listingsData]);
  const { data: market } = useMarketOverview();
  const { recentlyViewed: recentlyViewedIds } = useRecentlyViewed();
  const recentlyViewed = recentlyViewedIds
    .slice(0, 4)
    .map((id) => (listingsData ?? []).find((l) => l.id === id))
    .filter(Boolean);

  // Price history for the most-listed species, derived from real snapshots only.
  const featuredSpeciesId = market?.trending_up[0]?.species?.id ?? market?.most_traded[0]?.species?.id;
  const { data: featuredSnapshots } = usePriceSnapshots(featuredSpeciesId, undefined, 90);
  const chartData = useMemo(
    () => featuredSnapshots.map((ps) => ({ date: ps.snapshot_date, price: ps.median_price_thb })),
    [featuredSnapshots]
  );

  useEffect(() => {
    const timer = setTimeout(() => setHeroLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const featuredSpeciesName = market?.trending_up[0]?.species?.common_name_en
    || market?.trending_up[0]?.species?.scientific_name
    || market?.most_traded[0]?.species?.common_name_en
    || market?.most_traded[0]?.species?.scientific_name
    || '';

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className={`absolute right-0 top-0 w-full lg:w-[60%] h-full transition-all duration-1500 ease-out ${heroLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
          <img src="/images/hero.jpg" alt={t('home:hero.alt')} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20">
          <div className="max-w-2xl">
            <div className={`transition-all duration-1000 delay-300 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight mb-6 leading-snug break-words">
                {t('home:newHero.headline')}
              </h1>
            </div>
            <div className={`transition-all duration-1000 delay-500 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-lg text-zinc-400 mb-8 max-w-md leading-relaxed">
                {t('home:newHero.subheadline')}
              </p>
            </div>
            <div className={`flex flex-wrap gap-4 transition-all duration-1000 delay-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link to="/browse" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition-all">
                {t('home:newHero.ctaBrowse')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/seller-dashboard/listings/new" className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white/5 transition-all">
                {t('home:newHero.ctaSell')}
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
                <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{t('home:sections.recentlyViewed')}</h2>
                <p className="text-zinc-500">{t('home:sections.recentlyViewedSubtitle')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentlyViewed.map(listing => (
                <ListingCard
                  key={listing!.id}
                  listing={listing!}
                  layout="minimal"
                  topSlot={(
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" /> {t('home:sections.recentlyViewed')}
                    </div>
                  )}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fresh Listings */}
      <section className="pt-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{t('home:sections.freshListings')}</h2>
              <p className="text-zinc-500">{t('home:sections.freshListingsSubtitle')}</p>
            </div>
            <Link to="/browse?all=1" className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              {t('common:actions.seeAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {listings.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/30 border border-white/5 rounded-xl">
              <Search className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500 mb-2">{t('home:sections.freshListingsSubtitle')}</p>
              <Link to="/seller-dashboard/listings/new" className="text-emerald-400 text-sm hover:underline">{t('common:actions.addNew')}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} layout="minimal" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Market Pulse */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-2">{t('home:sections.marketPulse')}</h2>
              <p className="text-zinc-500">{t('home:sections.marketPulseSubtitle')}</p>
            </div>
            <Link to="/market" className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              {t('common:actions.seeAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                {t('marketplace:market.trendingUp')}
              </h3>
              {(market?.trending_up.length ?? 0) === 0 ? (
                <p className="text-zinc-600 text-sm py-8 text-center">{t('home:noPriceHistory')}</p>
              ) : (
                <div className="space-y-3">
                  {market?.trending_up.slice(0, 5).map((item, i) => (
                    <Link to={`/species/${item.species.id}`} key={i} className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{item.species.common_name_en || item.species.scientific_name}</p>
                        <p className="text-xs text-zinc-500">{t('home:salesCount', { count: item.sales_count })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{Math.round(item.current_median).toLocaleString()} {t('common:currency')}</p>
                        <p className="text-xs text-emerald-400">+{item.percent_change.toFixed(1)}%</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                {t('home:priceHistory')}{featuredSpeciesName ? ` — ${featuredSpeciesName}` : ''}
              </h3>
              {chartData.length > 0 ? (
                <>
                  <LazyPriceChart data={chartData} height={200} showArea={true} />
                  <div className="flex items-center justify-between mt-4 text-xs text-zinc-500">
                    <span>90-day median: {Math.round(chartData[chartData.length - 1].price).toLocaleString()} {t('common:currency')}</span>
                    <span className="text-emerald-400">{t('home:liveData')}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-600 py-12 text-center">{t('home:noPriceHistory')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-12">{t('home:sections.howItWorks')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: t('home:howItWorks.step1'), desc: t('home:howItWorks.step1Desc') },
              { title: t('home:howItWorks.step2'), desc: t('home:howItWorks.step2Desc') },
              { title: t('home:howItWorks.step3'), desc: t('home:howItWorks.step3Desc') },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-light text-zinc-800 mb-4">0{i + 1}</div>
                <h3 className="text-xl font-medium mb-2">{step.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller CTA */}
      <section className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-2">{t('home:sections.sellerCta')}</h2>
              <p className="text-zinc-500">{t('home:sections.sellerCtaSubtitle')}</p>
            </div>
            <Link to="/seller-dashboard/listings/new" className="inline-flex items-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors">
              {t('home:newHero.ctaSell')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
