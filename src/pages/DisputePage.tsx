import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => navigate(`/order/${transactionId}`), 2000);
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
            <div className="flex gap-3">
              <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-sm">
                <Camera className="w-4 h-4" /> Take Photo
              </button>
              <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-sm">
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-medium h-11 rounded-lg">
            Submit Dispute
          </Button>
        </form>
      </div>
    </div>
  );
}
