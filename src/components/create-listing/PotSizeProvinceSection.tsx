import { useTranslation } from 'react-i18next';
import { ProvinceCombobox } from '@/components/ProvinceCombobox';
import type { ProvinceOption } from '@/lib/provinces';

interface PotSizeProvinceSectionProps {
  potSize: string;
  setPotSize: (value: string) => void;
  province: string;
  setProvince: (value: string) => void;
  provinceOptions: ProvinceOption[];
  error?: string;
}

export default function PotSizeProvinceSection({
  potSize,
  setPotSize,
  province,
  setProvince,
  provinceOptions,
  error,
}: PotSizeProvinceSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.potSizeLabel')}</label>
        <input
          type="number"
          value={potSize}
          onChange={(e) => setPotSize(e.target.value)}
          placeholder={t('marketplace:create.potSizePlaceholder')}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          {t('marketplace:create.provinceLabel')}
        </label>
        <ProvinceCombobox
          value={province}
          onChange={setProvince}
          placeholder={t('marketplace:create.selectProvince')}
          options={provinceOptions}
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
}
