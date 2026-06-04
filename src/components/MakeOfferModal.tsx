import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { Listing } from '@/types';
import { createOffer } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface MakeOfferModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function MakeOfferModal({ listing, isOpen, onClose, onSubmitted }: MakeOfferModalProps) {
  const { user } = useAuth();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const maxPrice = listing.price_thb - 1;
  const priceNum = parseInt(price, 10);
  const isValid = !isNaN(priceNum) && priceNum >= 10 && priceNum <= maxPrice;

  const handleSubmit = async () => {
    if (!user) {
      toast.info('Log in to make an offer.');
      return;
    }
    if (!isValid) {
      toast.error(`Offer must be between 10 and ${maxPrice.toLocaleString()} THB.`);
      return;
    }
    setSubmitting(true);
    try {
      await createOffer({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        offer_price_thb: priceNum,
        message: message.trim() || undefined,
      });
      toast.success('Offer submitted!');
      setPrice('');
      setMessage('');
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            Make an Offer
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">Current listing price</p>
          <p className="text-lg font-semibold text-white">{listing.price_thb.toLocaleString()} THB</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Your Offer (THB) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`Max ${maxPrice.toLocaleString()} THB`}
              min={10}
              max={maxPrice}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
            {priceNum > maxPrice && (
              <p className="text-xs text-red-400 mt-1">Must be less than listing price</p>
            )}
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Message to seller (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I can pick up today in Bangkok..."
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
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
