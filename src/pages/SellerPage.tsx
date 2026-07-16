import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Star, Store, MapPin, Calendar, Leaf } from 'lucide-react';
import { ListingCard } from '@/components/ListingCard';
import { useSeller } from '@/hooks/queries/useSeller';
import { useListings } from '@/hooks/queries/useListings';
import { getProvinceLabel } from '@/lib/provinces';
import { SellerReviewsSection } from '@/components/SellerReviewsSection';

export default function SellerPage() {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const { id } = useParams<{ id: string }>();
  const { data: seller, isPending: sellerLoading } = useSeller(id);
  const { data: allListings, isPending: listingsLoading } = useListings();
  const listings = (allListings || []).filter((l) => l.seller_id === id);

  if (sellerLoading || listingsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-black text-white">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">{t('common:actions.loading')}</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">{t('marketplace:seller.notFound')}</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">{t('marketplace:seller.backToBrowse')}</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common:actions.back')}
        </Link>

        {/* Seller Profile */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-light shrink-0 overflow-hidden">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt={t('marketplace:seller.avatarAlt', { name: seller.display_name })} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                seller.display_name.charAt(0)
              )}
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-tight mb-1">{seller.display_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mb-3">
                {seller.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {getProvinceLabel(seller.location, i18n.language)}</span>}
                {seller.rating && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> {seller.rating}</span>}
                <span className="flex items-center gap-1"><Store className="w-3.5 h-3.5" /> {t('marketplace:seller.salesCount', { count: seller.sales_count })}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t('marketplace:seller.memberSince', { year: new Date(seller.created_at).getFullYear() })}</span>
              </div>
              <p className="text-sm text-zinc-400">
                {t('marketplace:seller.trustedDescription', { count: seller.sales_count, rating: seller.rating })}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">{t('marketplace:seller.reviews')}</h2>
          <SellerReviewsSection sellerId={seller.id} />
        </div>

        {/* Active Listings */}
        <h2 className="text-lg font-medium mb-4">{t('marketplace:seller.activeListingsCount', { count: listings.length })}</h2>
        {listings.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(l => (
              <ListingCard key={l.id} listing={l} layout="seller" />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">{t('marketplace:seller.noActiveListings')}</p>
        )}
      </div>
    </div>
  );
}
