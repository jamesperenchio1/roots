import { useState } from 'react';
import { X, Tag, TrendingUp, Clock, Eye, Heart } from 'lucide-react';
import { toast } from 'sonner';
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
      toast.info('Log in to make an offer.');
      return;
    }
    if (!isValid) {
      toast.error('Offer must be at least 10 THB.');
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
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
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

        {/* Price history — helps the buyer gauge a fair offer */}
        <div className="mb-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Price history (90d)</p>
            {stats && <p className="text-xs text-zinc-500">median {Math.round(stats.median).toLocaleString()} · range {Math.round(stats.min).toLocaleString()}–{Math.round(stats.max).toLocaleString()}</p>}
          </div>
          {chartData.length > 0 ? (
            <PriceChart data={chartData} height={120} showArea />
          ) : (
            <p className="text-xs text-zinc-600 py-6 text-center">No market price history yet for this species.</p>
          )}
        </div>

        {/* Plant history / provenance */}
        <div className="mb-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> This plant's history</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {listedDate && <span>Listed {listedDate}</span>}
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {listing.view_count ?? 0} views</span>
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {listing.watch_count ?? 0} watching</span>
            {provenance && <span>{provenance.total_owners} owner{provenance.total_owners === 1 ? '' : 's'}</span>}
            {provenance && provenance.total_sales_value > 0 && <span>past sales {provenance.total_sales_value.toLocaleString()} THB</span>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Your Offer (THB) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter your offer"
              min={10}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />

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
