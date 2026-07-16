'use client'

import { useTranslation } from 'react-i18next';

interface DeliverySectionProps {
  delivery: string[];
  toggle: (option: string) => void;
  error?: string;
}

export default function DeliverySection({ delivery, toggle, error }: DeliverySectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{t('marketplace:create.deliveryLabel')}</label>
      <div className="flex gap-3">
        {['ship', 'pickup'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex-1 py-3 rounded-lg border text-sm capitalize transition-colors ${
              delivery.includes(opt)
                ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {opt === 'ship' ? t('marketplace:listing.shipping') : t('marketplace:listing.pickup')}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
