'use client'

import { useState } from 'react';
import { X, Truck, Camera, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updateOrderStatus, uploadListingPhoto } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MarkShippedModalProps {
  orderId: string;
  onClose: () => void;
  onShipped: () => void;
}

const COURIERS = ['Kerry Express', 'Flash Express', 'J&T Express', 'Thailand Post (EMS)', 'Grab Express'];

export default function MarkShippedModal({ orderId, onClose, onShipped }: MarkShippedModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation(['checkout', 'common']);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) { toast.error(t('common:errors.unauthorized')); return; }
    setUploading(true);
    try {
      const url = await uploadListingPhoto(file, user.id);
      setPhotoUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkout:markShipped.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!tracking.trim()) {
      toast.error(t('checkout:markShipped.errors.trackingRequired'));
      return;
    }
    if (!courier) {
      toast.error(t('checkout:markShipped.errors.courierRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await updateOrderStatus(orderId, {
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        courier,
        tracking_number: tracking.trim(),
        shipment_photo_url: photoUrl,
      });
      toast.success(t('checkout:markShipped.success'));
      onShipped();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkout:markShipped.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            {t('checkout:order.markShipped')}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white" aria-label={t('common:actions.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:markShipped.courierLabel')}</label>
            <select
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">{t('checkout:markShipped.selectCourier')}</option>
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:markShipped.trackingLabel')}</label>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder={t('checkout:markShipped.trackingPlaceholder')}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:markShipped.photoLabel')}</label>
            {photoUrl ? (
              <div className="relative w-full">
                <img src={photoUrl} alt={t('checkout:packedShipmentAlt')} className="w-full h-40 object-cover rounded-lg border border-white/10" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-zinc-300 hover:text-red-400"
                  aria-label={t('common:actions.remove')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border border-dashed border-white/15 rounded-lg cursor-pointer text-zinc-500 hover:border-emerald-500/40 hover:text-zinc-300 transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                <span className="text-xs">{uploading ? t('common:actions.uploading') : t('checkout:markShipped.uploadLabel')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
              </label>
            )}
            <p className="text-xs text-zinc-600 mt-1.5">{t('checkout:markShipped.photoHint')}</p>
          </div>

          <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 text-xs text-zinc-500">
            <p className="mb-1">{t('checkout:markShipped.beforeYouShip.title')}</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t('checkout:markShipped.beforeYouShip.packed')}</li>
              <li>{t('checkout:markShipped.beforeYouShip.fragileLabel')}</li>
            </ul>
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
            disabled={submitting || uploading}
            className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {submitting ? t('common:actions.saving') : t('checkout:markShipped.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
