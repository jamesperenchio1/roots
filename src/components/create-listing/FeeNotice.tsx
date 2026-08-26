'use client'

import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { calculatePlatformFees, PLATFORM_FEE_PERCENT } from '@/lib/platform-config';

interface FeeNoticeProps {
  price: string;
  currency: string;
}

export default function FeeNotice({ price, currency }: FeeNoticeProps) {
  const { t } = useTranslation(['marketplace', 'common']);
  const numericPrice = parseInt(price) || 0;
  const { platformFeeThb: fee, sellerPayoutThb: net } = calculatePlatformFees(numericPrice);

  if (PLATFORM_FEE_PERCENT === 0) {
    return (
      <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-zinc-300">{t('marketplace:create.feeNoticeZero')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-sm">
      <div className="flex items-start gap-2">
        <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-zinc-300">
            {t('marketplace:create.feeNotice', {
              net: net.toLocaleString(),
              fee: fee.toLocaleString(),
              currency,
              percent: PLATFORM_FEE_PERCENT,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
