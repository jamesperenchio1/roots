'use client'

import { CheckCircle, ScanSearch } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fetchPendingListings, adminReviewListing } from '@/lib/listing-review';
import { useAuth } from '@/hooks/useAuth';
import type { Listing } from '@/types';

export function ListingsSection() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPendingListings();
      setListings(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:admin.review.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const current = listings[0];

  const handleDecision = async (decision: 'active' | 'rejected') => {
    if (!current || !user) return;
    const finalReason = reason.trim() || (decision === 'active' ? 'Approved' : 'Rejected');
    setProcessing(true);
    try {
      await adminReviewListing(current.id, decision, finalReason, notes.trim(), user.id);
      toast.success(decision === 'active' ? t('common:admin.review.approved') : t('common:admin.review.rejected'));
      setListings((prev) => prev.slice(1));
      setReason('');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:admin.review.reviewFailed'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className="text-zinc-500">{t('common:admin.review.loading')}</p>;

  if (!current) {
    return (
      <div className="text-center py-16 bg-zinc-900/20 rounded-xl">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-zinc-300 font-medium">{t('common:admin.review.emptyTitle')}</p>
        <p className="text-sm text-zinc-500">{t('common:admin.review.emptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden mb-4">
        <div className="aspect-square bg-zinc-800 relative">
          <img
            src={current.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white">
            {t('common:admin.review.pendingCount', { count: listings.length })}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-lg font-medium">{current.species?.common_name_en || current.species?.scientific_name}</h3>
            <p className="text-xs text-zinc-500">{current.species?.scientific_name}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-400 font-semibold">{current.price_thb.toLocaleString()} {t('common:currency')}</span>
            <span className="text-zinc-500">{current.size_category} · {current.delivery_options?.join(' + ')}</span>
          </div>
          <p className="text-xs text-zinc-500">
            {t('common:admin.review.sellerLabel')}: {current.seller?.display_name || current.seller_id}
          </p>
          {current.pickup_province && (
            <p className="text-xs text-zinc-500">
              {t('common:admin.review.pickupLabel')}: {current.pickup_province}{current.pickup_location ? ` · ${current.pickup_location}` : ''}
            </p>
          )}

          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${current.qr_verified_at ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
            {current.qr_verified_at ? <CheckCircle className="w-4 h-4" /> : <ScanSearch className="w-4 h-4" />}
            {current.qr_verified_at
              ? (current.qr_verification_photo_url ? t('common:admin.review.qrVerifiedWithPhoto') : t('common:admin.review.qrVerified'))
              : t('common:admin.review.qrNotVerified')}
          </div>

          {current.qr_verification_photo_url && (
            <a href={current.qr_verification_photo_url} target="_blank" rel="noreferrer" className="block">
              <img src={current.qr_verification_photo_url} alt={t('common:admin.review.qrVerificationAlt')} className="w-full h-32 object-cover rounded-lg border border-white/5" />
            </a>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">{t('common:admin.review.reasonLabel')}</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">{t('common:admin.review.selectReason')}</option>
            <option value="QR verified">{t('common:admin.review.reasons.qrVerified')}</option>
            <option value="Manual pass">{t('common:admin.review.reasons.manualPass')}</option>
            <option value="Photo unclear">{t('common:admin.review.reasons.photoUnclear')}</option>
            <option value="Wrong plant">{t('common:admin.review.reasons.wrongPlant')}</option>
            <option value="Manual fail">{t('common:admin.review.reasons.manualFail')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">{t('common:admin.review.notesLabel')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={processing}
          onClick={() => handleDecision('rejected')}
          className="flex-1 py-4 rounded-xl bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {t('common:admin.review.fail')}
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => handleDecision('active')}
          className="flex-1 py-4 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {t('common:admin.review.pass')}
        </button>
      </div>
    </div>
  );
}
