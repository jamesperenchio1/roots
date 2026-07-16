import { useTranslation } from 'react-i18next';
import type { UserLocation } from '@/types';

interface SavedPlacesSelectProps {
  loading: boolean;
  places: UserLocation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function SavedPlacesSelect({
  loading,
  places,
  selectedId,
  onSelect,
}: SavedPlacesSelectProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  if (loading) {
    return <p className="text-xs text-zinc-500">{t('marketplace:create.loadingSavedPlaces')}</p>;
  }

  if (places.length === 0) return null;

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">
        {t('marketplace:create.pickupFromSavedPlace')}
      </label>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
      >
        <option value="">{t('marketplace:create.selectSavedPlace')}</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.province ? ` · ${p.province}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
