'use client'

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import type { TFunction } from 'i18next';
import { MoreHorizontal, Eye, Settings, ScanSearch, DollarSign, Copy, Archive, Printer, Rocket } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { generateQrProvenance } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { publicKeys, userKeys } from '@/lib/queryKeys';
import { BoostModal } from '@/components/seller-dashboard/BoostModal';
import { STRIPE_KEY_CONFIGURED } from '@/lib/stripeClient';
import type { Listing } from '@/types';

interface ListingActionsProps {
  listing: Listing;
  onWithdraw: (id: string) => void;
  onMarkSold: (id: string) => void;
  onDuplicate: (id: string) => void;
  t: TFunction;
}

export function ListingActions({ listing, onWithdraw, onMarkSold, onDuplicate, t }: ListingActionsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
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

  const handlePrintQr = async () => {
    if (listing.plant_id) {
      router.push(`/p/${listing.plant_id}`);
      return;
    }
    setGeneratingQr(true);
    try {
      const plantId = await generateQrProvenance(listing.id);
      if (!plantId) throw new Error('no plant id');
      queryClient.invalidateQueries({ queryKey: publicKeys.listing(listing.id) });
      if (user) queryClient.invalidateQueries({ queryKey: userKeys.sellerListings(user.id) });
      router.push(`/p/${plantId}`);
    } catch {
      toast.error(t('common:errors.generic'));
    } finally {
      setGeneratingQr(false);
    }
  };

  return (
    <>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button disabled={verifying || generatingQr} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
          <DropdownMenuItem asChild className="cursor-pointer text-zinc-300 focus:text-zinc-300 hover:bg-white/5 focus:bg-white/5">
            <Link href={`/listing/${listing.id}`}><Eye className="size-3.5 mr-2" /> {t('common:actions.view')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer text-zinc-300 focus:text-zinc-300 hover:bg-white/5 focus:bg-white/5">
            <Link href={`/listing/${listing.id}/edit`}><Settings className="size-3.5 mr-2" /> {t('common:actions.edit')}</Link>
          </DropdownMenuItem>
          {listing.status === 'pending_review' && (
            <DropdownMenuItem onClick={() => fileRef.current?.click()} className="cursor-pointer text-emerald-400 focus:text-emerald-400 hover:bg-white/5 focus:bg-white/5">
              <ScanSearch className="size-3.5 mr-2" /> {t('dashboard:verifyQr')}
            </DropdownMenuItem>
          )}
          {(listing.status === 'active' || listing.status === 'pending_review') && (
            <DropdownMenuItem onClick={() => onMarkSold(listing.id)} className="cursor-pointer text-emerald-400 focus:text-emerald-400 hover:bg-white/5 focus:bg-white/5">
              <DollarSign className="size-3.5 mr-2" /> {t('dashboard:seller.markAsSold')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onDuplicate(listing.id)} className="cursor-pointer text-zinc-300 focus:text-zinc-300 hover:bg-white/5 focus:bg-white/5">
            <Copy className="size-3.5 mr-2" /> {t('common:actions.duplicate')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onWithdraw(listing.id)} className="cursor-pointer text-red-400 focus:text-red-400 hover:bg-white/5 focus:bg-white/5">
            <Archive className="size-3.5 mr-2" /> {t('common:actions.withdraw')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={generatingQr}
            onClick={handlePrintQr}
            className="cursor-pointer text-zinc-300 focus:text-zinc-300 hover:bg-white/5 focus:bg-white/5"
          >
            <Printer className="size-3.5 mr-2" /> {t('common:actions.print')} QR
          </DropdownMenuItem>
          {STRIPE_KEY_CONFIGURED && (
            <DropdownMenuItem onClick={() => setBoostOpen(true)} className="cursor-pointer text-amber-400 focus:text-amber-400 hover:bg-white/5 focus:bg-white/5">
              <Rocket className="size-3.5 mr-2" /> {t('common:actions.boost')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {STRIPE_KEY_CONFIGURED && (
        <BoostModal listing={listing} isOpen={boostOpen} onClose={() => setBoostOpen(false)} />
      )}
    </>
  );
}