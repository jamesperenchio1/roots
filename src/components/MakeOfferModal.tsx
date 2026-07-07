import { useState } from 'react';
import { X, Tag, TrendingUp, Clock, Eye, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Listing } from '@/types';
import { createOffer } from '@/lib/api';
import { getPriceSnapshotsForSpecies, getSpeciesPriceStats, getProvenanceChain } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';
import { useAuth } from '@/hooks/useAuth';

interface MakeOfferModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function MakeOfferModal({ listing, isOpen, onClose, onSubmitted }: MakeOfferModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['marketplace', 'common']);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const speciesId = listing.species?.id || listing.plant_id?.replace('p-', 'sp-') || '';
  const chartData = getPriceSnapshotsForSpecies(speciesId, undefined, 90).map(ps => ({
    date: ps.snapshot_date,
    price: ps.median_price_thb,
  }));
  const stats = getSpeciesPriceStats(speciesId, 30);
  const provenance = getProvenanceChain(listing.plant_id);
  const listedDate = listing.created_at ? new Date(listing.created_at).toLocaleDateString() : null;

  const priceNum = parseInt(price, 10);
  const isValid = !isNaN(priceNum) && priceNum >= 10;

  const handleSubmit = async () => {
    if (!user) {
      toast.info(t('marketplace:offer.loginRequired'));
      return;
    }
    if (!isValid) {
      toast.error(t('marketplace:offer.minOffer', { min: 10, currency: t('common:currency') }));
      return;
    }
    setSubmitting(true);
    try {
      const offer = await createOffer({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        offer_price_thb: priceNum,
        message: message.trim() || undefined,
      });
      toast.success(t('marketplace:offer.success'));
      setPrice('');
      setMessage('');
      onSubmitted();
      onClose();
      if (offer.conversation_id) {
        navigate(`/messages/${offer.conversation_id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('marketplace:offer.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            {t('marketplace:listing.makeOffer')}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white" aria-label={t('common:actions.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">{t('marketplace:offer.currentPrice')}</p>
          <p className="text-lg font-semibold text-white">{listing.price_thb.toLocaleString()} {t('common:currency')}</p>
        </div>

        {/* Price history — helps the buyer gauge a fair offer */}
        <div className="mb-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {t('marketplace:offer.priceHistory')}</p>
            {stats && <p className="text-xs text-zinc-500">{t('marketplace:offer.priceStats', { median: Math.round(stats.median).toLocaleString(), min: Math.round(stats.min).toLocaleString(), max: Math.round(stats.max).toLocaleString() })}</p>}
          </div>
          {chartData.length > 0 ? (
            <PriceChart data={chartData} height={120} showArea />
          ) : (
            <p className="text-xs text-zinc-600 py-6 text-center">{t('marketplace:offer.noPriceHistory')}</p>
          )}
        </div>

        {/* Plant history / provenance */}
        <div className="mb-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> {t('marketplace:offer.plantHistory')}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {listedDate && <span>{t('marketplace:offer.listedDate', { date: listedDate })}</span>}
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t('marketplace:offer.views', { count: listing.view_count ?? 0 })}</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {t('marketplace:offer.watching', { count: listing.watch_count ?? 0 })}</span>
            {provenance && <span>{t('marketplace:offer.owners', { count: provenance.total_owners })}</span>}
            {provenance && provenance.total_sales_value > 0 && <span>{t('marketplace:offer.pastSales', { amount: provenance.total_sales_value.toLocaleString(), currency: t('common:currency') })}</span>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('marketplace:offer.yourOffer')}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t('marketplace:offer.offerPlaceholder')}
              min={10}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />

          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('marketplace:offer.messageLabel')}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('marketplace:offer.messagePlaceholder')}
              rows={3}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {submitting ? t('marketplace:offer.submitting') : t('marketplace:offer.submitOffer')}
          </button>
        </div>
      </div>
    </div>
  );
}
