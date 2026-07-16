import { useTranslation } from 'react-i18next';
import SpeciesAutocomplete from '@/components/SpeciesAutocomplete';
import type { SpeciesEntry } from '@/data/speciesDatabase';

interface SpeciesSectionProps {
  value: string;
  onChange: (query: string, selected?: SpeciesEntry) => void;
  species: SpeciesEntry | null;
  error?: string;
}

export default function SpeciesSection({ value, onChange, species, error }: SpeciesSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div>
      <SpeciesAutocomplete
        value={value}
        onChange={onChange}
        label={t('marketplace:create.speciesLabel')}
        placeholder={t('marketplace:create.speciesPlaceholder')}
      />
      {species && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full capitalize">
            {species.category}
          </span>
          <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {t('marketplace:create.careLabel')}: {species.care_level}
          </span>
          <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {species.common_name_th}
          </span>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
