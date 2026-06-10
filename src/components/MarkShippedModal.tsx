import { useState } from 'react';
import { X, Truck, Camera, Loader2 } from 'lucide-react';
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
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) { toast.error('You must be signed in.'); return; }
    setUploading(true);
    try {
      const url = await uploadListingPhoto(file, user.id);
      setPhotoUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!tracking.trim()) {
      toast.error('Please enter a tracking number.');
      return;
    }
    if (!courier) {
      toast.error('Please select a courier.');
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
      toast.success('Marked as shipped!');
      onShipped();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
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
            Mark as Shipped
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Courier *</label>
            <select
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Select courier</option>
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Tracking Number *</label>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. TH123456789"
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Photo of packed box (optional)</label>
            {photoUrl ? (
              <div className="relative w-full">
                <img src={photoUrl} alt="Packed shipment" className="w-full h-40 object-cover rounded-lg border border-white/10" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-zinc-300 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border border-dashed border-white/15 rounded-lg cursor-pointer text-zinc-500 hover:border-emerald-500/40 hover:text-zinc-300 transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                <span className="text-xs">{uploading ? 'Uploading…' : 'Tap to add a photo of the packed box'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
              </label>
            )}
            <p className="text-xs text-zinc-600 mt-1.5">Protects you in disputes — proof the plant left packed and healthy.</p>
          </div>

          <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 text-xs text-zinc-500">
            <p className="mb-1">💡 <strong>Before you ship:</strong></p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Packed the plant securely</li>
              <li>Added "FRAGILE — LIVE PLANTS" label</li>
            </ul>
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
            disabled={submitting || uploading}
            className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Confirm Shipment'}
          </button>
        </div>
      </div>
    </div>
  );
}
