import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Upload, Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createDispute, uploadDisputeEvidence } from '@/lib/api';
import { toast } from 'sonner';

const REASONS = [
  { value: 'DOA', label: 'Dead on Arrival' },
  { value: 'mismatch', label: 'Does not match listing' },
  { value: 'wrong_species', label: 'Wrong species' },
  { value: 'pests', label: 'Pests or disease' },
  { value: 'root_rot', label: 'Root rot' },
  { value: 'transit_damage', label: 'Transit damage' },
  { value: 'other', label: 'Other' },
];

export default function DisputePage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (evidenceUrls.length >= 5) {
      toast.error('Maximum 5 evidence photos allowed.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadDisputeEvidence(file, 'buyer');
      setEvidenceUrls(prev => [...prev, url]);
      toast.success('Evidence uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeEvidence = (idx: number) => {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await createDispute({
        transaction_id: transactionId || '',
        opened_by: 'buyer',
        reason,
        description,
        evidence_urls: evidenceUrls,
      });
      setSubmitted(true);
      setTimeout(() => navigate(`/order/${transactionId}`), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit dispute.');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <div className="max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light mb-2">Dispute Submitted</h1>
          <p className="text-zinc-500 mb-6">Our team will review your case within 24 hours. Both parties will be notified.</p>
          <Link to={`/order/${transactionId}`} className="text-emerald-400 hover:underline text-sm">Back to Order</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <Link to={`/order/${transactionId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Order
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-light tracking-tight">Open Dispute</h1>
        </div>

        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-400">
            Escrow funds are currently frozen. Opening a dispute will pause the auto-release
            until our team makes a ruling. Please provide clear evidence.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              required
            >
              <option value="">Select a reason</option>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={5}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              required
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Evidence</label>
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
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>

            {/* Evidence previews */}
            {evidenceUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {evidenceUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-800">
                    <img src={url} alt="Dispute evidence" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeEvidence(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-500"
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
            Submit Dispute
          </Button>
        </form>
      </div>
    </div>
  );
}
