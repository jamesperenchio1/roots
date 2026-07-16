import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

interface FeeNoticeProps {
  price: string;
  currency: string;
}

export default function FeeNotice({ price, currency }: FeeNoticeProps) {
  const { t } = useTranslation(['marketplace', 'common']);
  const numericPrice = parseInt(price) || 0;
  const fee = Math.round(numericPrice * 0.08);
  const net = Math.max(0, numericPrice - fee);

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
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
