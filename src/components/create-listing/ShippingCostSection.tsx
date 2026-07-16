'use client'

import { useTranslation } from 'react-i18next';

interface ShippingCostSectionProps {
  shippingCost: string;
  setShippingCost: (value: string) => void;
}

export default function ShippingCostSection({ shippingCost, setShippingCost }: ShippingCostSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">
        {t('marketplace:create.shippingCostLabel')}
      </label>
      <input
        type="number"
        min="0"
        max="5000"
        value={shippingCost}
        onChange={(e) => setShippingCost(e.target.value)}
        placeholder={t('marketplace:create.shippingCostPlaceholder')}
        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
      />
      <p className="text-xs text-zinc-500 mt-1">{t('marketplace:create.freeShippingNote')}</p>
      <p className="text-xs text-emerald-400/80 mt-1">{t('marketplace:create.shippingChangeableNote')}</p>
    </div>
  );
}
