import type { OfferStatus } from '@/types';

const OFFER_STATUS_STYLES: Record<OfferStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  accepted: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
  countered: 'bg-blue-500/10 text-blue-400',
  withdrawn: 'bg-zinc-500/10 text-zinc-400',
};

interface StatusBadgeProps {
  status: OfferStatus;
  label: string;
  className?: string;
}

export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${OFFER_STATUS_STYLES[status]} ${className}`}
    >
      {label}
    </span>
  );
}
