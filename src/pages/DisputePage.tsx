import { useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Upload, Camera, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { createDispute, uploadDisputeEvidence } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTransaction } from '@/hooks/queries/useTransaction';
import { toast } from 'sonner';

const REASONS = [
  { value: 'DOA' },
  { value: 'mismatch' },
  { value: 'wrong_species' },
  { value: 'pests' },
  { value: 'root_rot' },
  { value: 'transit_damage' },
  { value: 'other' },
];

export default function DisputePage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['checkout', 'common']);
  const { user } = useAuth();
  const { data: tx, isPending: txPending } = useTransaction(transactionId);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const txError = useMemo(() => {
    if (txPending || !transactionId) return null;
    if (!tx) return t('checkout:dispute.orderNotFound');
    if (tx.buyer_id !== user?.id && tx.seller_id !== user?.id) return t('common:errors.unauthorized');
    return null;
  }, [txPending, tx, transactionId, user?.id, t]);

  const openedBy = useMemo(() => {
    if (!tx || !user) return null;
    if (tx.buyer_id === user.id) return 'buyer' as const;
    if (tx.seller_id === user.id) return 'seller' as const;
    return null;
  }, [tx, user]);

  const reasonOptions = REASONS.map((r) => ({
    value: r.value,
    label: t(`checkout:dispute.reasons.${r.value}` as const),
  }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (evidenceUrls.length >= 5) {
      toast.error(t('checkout:dispute.maxEvidence'));
      return;
    }
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadDisputeEvidence(file, user.id);
      setEvidenceUrls((prev) => [...prev, url]);
      toast.success(t('checkout:dispute.evidenceUploaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkout:dispute.uploadFailed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeEvidence = (idx: number) => {
    setEvidenceUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description) {
      toast.error(t('common:errors.required'));
      return;
    }
    if (!openedBy || !transactionId) {
      toast.error(t('common:errors.unauthorized'));
      return;
    }
    setSubmitting(true);
    try {
      await createDispute({
        transaction_id: transactionId,
        opened_by: openedBy,
        reason,
        description,
        evidence_urls: evidenceUrls,
      });
      setSubmitted(true);
      setTimeout(() => navigate(`/order/${transactionId}`), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkout:dispute.submitFailed'));
      setSubmitting(false);
    }
  };

  if (txPending) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
      </div>
    );
  }

  if (txError) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <div className="max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light mb-2">{t('common:errors.generic')}</h1>
          <p className="text-zinc-500 mb-6">{txError}</p>
          <Link to={`/order/${transactionId}`} className="text-emerald-400 hover:underline text-sm">{t('checkout:dispute.backToOrder')}</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <div className="max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light mb-2">{t('checkout:dispute.submittedTitle')}</h1>
          <p className="text-zinc-500 mb-6">{t('checkout:dispute.submittedDescription')}</p>
          <Link to={`/order/${transactionId}`} className="text-emerald-400 hover:underline text-sm">{t('checkout:dispute.backToOrder')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <Link to={`/order/${transactionId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('checkout:backToOrder')}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-light tracking-tight">{t('checkout:order.openDispute')}</h1>
        </div>

        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-400">
            {t('checkout:dispute.warning')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:dispute.reasonLabel')}</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              required
            >
              <option value="">{t('checkout:dispute.selectReason')}</option>
              {reasonOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:dispute.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('checkout:dispute.descriptionPlaceholder')}
              rows={5}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              required
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:dispute.evidenceLabel')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-sm disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {t('checkout:dispute.takePhoto')}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {t('checkout:dispute.upload')}
              </button>
            </div>

            {/* Evidence previews */}
            {evidenceUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {evidenceUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-800">
                    <img src={url} alt={t('checkout:dispute.evidenceAlt')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeEvidence(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500"
                      aria-label={t('common:actions.remove')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-red-500 hover:bg-red-600 text-white font-medium h-11 rounded-lg">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('checkout:dispute.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
