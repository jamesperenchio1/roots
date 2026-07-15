import { useState, memo } from 'react';
import { Check, X, RotateCcw, ArrowLeft, Tag, Clock, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Offer } from '@/types';
import { PLANT_IMAGES } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';

interface OfferCardProps {
  offer: Offer;
  mode: 'seller' | 'buyer';
  onRespond?: (status: 'accepted' | 'rejected' | 'countered', counterPrice?: number) => void;
  onWithdraw?: () => void;
}

function OfferCardInner({ offer, mode, onRespond, onWithdraw }: OfferCardProps) {
  const { t } = useTranslation(['marketplace', 'common']);
  const [counterMode, setCounterMode] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');

  const thumbnail = offer.listing?.photos?.[0]?.storage_path
    || PLANT_IMAGES[offer.listing?.plant_id?.replace('p-', 'sp-') || '']
    || '/images/plants/monstera-thai.jpg';

  const plantName = offer.listing?.species?.common_name_en
    || offer.listing?.species?.scientific_name
    || t('common:unknown');

  const handleCounterSubmit = () => {
    const num = parseInt(counterPrice, 10);
    if (!isNaN(num) && num >= 10 && onRespond) {
      onRespond('countered', num);
      setCounterMode(false);
      setCounterPrice('');
    }
  };

  const statusLabel = t(`marketplace:offer.status.${offer.status}`);

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
          <img src={thumbnail} alt={plantName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-medium truncate">{plantName}</p>
            <StatusBadge status={offer.status} label={statusLabel} />
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mb-1">
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {offer.offer_price_thb.toLocaleString()} {t('common:currency')}</span>
            {offer.counter_price_thb !== undefined && (
              <span className="text-blue-400">{t('marketplace:offer.counterLabel', { amount: offer.counter_price_thb.toLocaleString(), currency: t('common:currency') })}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(offer.created_at).toLocaleDateString()}</span>
            {mode === 'seller' && offer.buyer?.display_name && (
              <span>{t('marketplace:offer.from', { name: offer.buyer.display_name })}</span>
            )}
            {mode === 'buyer' && offer.seller?.display_name && (
              <span>{t('marketplace:offer.to', { name: offer.seller.display_name })}</span>
            )}
          </div>
          {offer.message && (
            <div className="flex items-start gap-1 mt-1.5 text-xs text-zinc-400">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{offer.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {mode === 'seller' && offer.status === 'pending' && (
        <div className="mt-3 pt-3 border-t border-white/5">
          {!counterMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => onRespond?.('accepted')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Check className="w-3 h-3" /> {t('common:actions.accept')}
              </button>
              <button
                onClick={() => onRespond?.('rejected')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <X className="w-3 h-3" /> {t('common:actions.reject')}
              </button>
              <button
                onClick={() => setCounterMode(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> {t('common:actions.counter')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder={t('marketplace:offer.counterPlaceholder')}
                className="w-32 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleCounterSubmit}
                className="px-3 py-1.5 rounded-lg text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                {t('common:actions.confirm')}
              </button>
              <button
                onClick={() => { setCounterMode(false); setCounterPrice(''); }}
                className="px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'buyer' && offer.status === 'pending' && onWithdraw && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <button
            onClick={onWithdraw}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors"
          >
            <X className="w-3 h-3" /> {t('marketplace:offer.withdrawOffer')}
          </button>
        </div>
      )}

      {mode === 'buyer' && offer.status === 'countered' && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex gap-2">
            <button
              onClick={() => onRespond?.('accepted')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Check className="w-3 h-3" /> {t('common:actions.accept')}
            </button>
            <button
              onClick={() => onRespond?.('rejected')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3 h-3" /> {t('common:actions.reject')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const OfferCard = memo(OfferCardInner);
export default OfferCard;
