import { useTranslation } from 'react-i18next';
import { getMarketSpeciesFromData } from '@/lib/api';
import { usePublicData } from '@/hooks/queries/usePublicData';

export function SpeciesSection() {
  const { t } = useTranslation(['common']);
  const { data: publicData } = usePublicData();
  const species = getMarketSpeciesFromData(publicData);
  return (
    <div className="space-y-2">
      {species.slice(0, 10).map((s) => (
        <div key={s.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium">{s.scientific_name}</p>
            <p className="text-xs text-zinc-500">{s.common_name_en} | {s.category}</p>
          </div>
          <button className="text-xs text-zinc-500 hover:text-white transition-colors">{t('common:actions.edit')}</button>
        </div>
      ))}
    </div>
  );
}
