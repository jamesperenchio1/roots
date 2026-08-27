'use client'

import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PromptPayVerifiedBadgeProps {
  className?: string;
}

// Small trust signal shown wherever a buyer is deciding whether to trust a
// seller for a direct/P2P payment: the seller has saved a PromptPay ID in
// Account settings. This is not KYC — it's just surfacing existing data.
export function PromptPayVerifiedBadge({ className = '' }: PromptPayVerifiedBadgeProps) {
  const { t } = useTranslation('marketplace');
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ${className}`}
    >
      <CheckCircle2 className="w-3 h-3" />
      {t('marketplace:seller.promptpayVerified')}
    </span>
  );
}
