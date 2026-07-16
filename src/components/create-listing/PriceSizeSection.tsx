import { useTranslation } from 'react-i18next';

interface PriceSizeSectionProps {
  price: string;
  setPrice: (value: string) => void;
  size: string;
  setSize: (value: string) => void;
  sizes: readonly string[];
  errors: {
    price?: string;
    size?: string;
  };
}

export default function PriceSizeSection({
  price,
  setPrice,
  size,
  setSize,
  sizes,
  errors,
}: PriceSizeSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.priceLabel')}</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t('marketplace:create.pricePlaceholder')}
          min="10"
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
        />
        {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.sizeLabel')}</label>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">{t('marketplace:create.selectSize')}</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {t(`marketplace:create.sizeLabels.${s}`)}
            </option>
          ))}
        </select>
        {errors.size && <p className="text-xs text-red-400 mt-1">{errors.size}</p>}
      </div>
    </div>
  );
}
