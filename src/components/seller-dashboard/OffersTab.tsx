import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import OfferCard from '@/components/OfferCard';
import { getOffersForSeller, respondToOffer, notifyOfferResponse } from '@/lib/api';

interface OffersTabProps {
  offers: ReturnType<typeof getOffersForSeller>;
  currentUserId: string;
  t: TFunction;
}

export function OffersTab({ offers, currentUserId, t }: OffersTabProps) {
  const sellerOffers = offers.filter((o) => o.seller_id === currentUserId);
  const pendingOffers = sellerOffers.filter((o) => o.status === 'pending');
  const otherOffers = sellerOffers.filter((o) => o.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-1">{t('dashboard:seller.incomingOffers')} ({pendingOffers.length} {t('common:status.pending')})</h2>
        <p className="text-xs text-zinc-500 mb-3">{t('dashboard:seller.respondToOffers')}</p>
        <div className="space-y-3">
          {pendingOffers.length > 0 ? pendingOffers.map((o) => (
            <OfferCard key={o.id} offer={o} mode="seller" onRespond={async (status: 'accepted' | 'rejected' | 'countered', counterPrice?: number) => {
              try {
                await respondToOffer(o.id, status, counterPrice);
                if (status === 'accepted' || status === 'rejected' || status === 'countered') {
                  await notifyOfferResponse(o.buyer_id || '', o.id, status);
                }
                toast.success(t('dashboard:seller.offerResponded'));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
              }
            }} />
          )) : (
            <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noPendingOffers')}</p>
          )}
        </div>
      </div>
      {otherOffers.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-1">{t('dashboard:seller.pastOffers')}</h2>
          <div className="space-y-3">
            {otherOffers.map((o) => <OfferCard key={o.id} offer={o} mode="seller" />)}
          </div>
        </div>
      )}
    </div>
  );
}
