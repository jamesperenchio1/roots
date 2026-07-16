import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { MoreHorizontal, Eye, Settings, ScanSearch, DollarSign, Copy, Archive, Printer, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { Listing } from '@/types';

interface ListingActionsProps {
  listing: Listing;
  onWithdraw: (id: string) => void;
  onMarkSold: (id: string) => void;
  onDuplicate: () => void;
  t: TFunction;
}

export function ListingActions({ listing, onWithdraw, onMarkSold, onDuplicate, t }: ListingActionsProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVerifyFile = async (file: File) => {
    if (!user) return;
    setVerifying(true);
    try {
      const { submitListingQrVerification } = await import('@/lib/listing-review');
      const result = await submitListingQrVerification(listing, file, user.id);
      if (result.ok) {
        toast.success(t('dashboard:seller.qrVerifiedToast'));
      } else {
        toast.error(result.error || t('dashboard:seller.qrVerifyFailed'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('dashboard:seller.qrVerifyError'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleVerifyFile(file);
        }}
      />
      <button onClick={() => setOpen(!open)} disabled={verifying} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-20 py-1">
          <Link to={`/listing/${listing.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Eye className="w-3.5 h-3.5" /> {t('common:actions.view')}</Link>
          <Link to={`/listing/${listing.id}/edit`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Settings className="w-3.5 h-3.5" /> {t('common:actions.edit')}</Link>
          {listing.status === 'pending_review' && (
            <button
              onClick={() => { fileRef.current?.click(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-white/5"
            >
              <ScanSearch className="w-3.5 h-3.5" /> {t('dashboard:verifyQr')}
            </button>
          )}
          {(listing.status === 'active' || listing.status === 'pending_review') && (
            <button
              onClick={() => { onMarkSold(listing.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-white/5"
            >
              <DollarSign className="w-3.5 h-3.5" /> {t('dashboard:seller.markAsSold')}
            </button>
          )}
          <button onClick={() => { onDuplicate(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Copy className="w-3.5 h-3.5" /> {t('common:actions.duplicate')}</button>
          <button onClick={() => { onWithdraw(listing.id); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-white/5"><Archive className="w-3.5 h-3.5" /> {t('common:actions.withdraw')}</button>
          <Link to={`/p/${listing.plant_id || listing.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Printer className="w-3.5 h-3.5" /> {t('common:actions.print')} QR</Link>
          <button onClick={() => { toast.info(t('dashboard:seller.boostComingSoon')); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Rocket className="w-3.5 h-3.5" /> {t('common:actions.boost')}</button>
        </div>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  );
}
