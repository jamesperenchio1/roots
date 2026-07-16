'use client'

import { useTranslation } from 'react-i18next';
import MapLocationPicker from '@/components/MapLocationPickerDynamic';

interface MapValue {
  lat: number;
  lng: number;
  address?: string;
}

interface PickupLocationSectionProps {
  coords: { lat: number; lng: number } | null;
  onChange: (value: MapValue) => void;
  pickupLocation: string;
  setPickupLocation: (value: string) => void;
}

export default function PickupLocationSection({
  coords,
  onChange,
  pickupLocation,
  setPickupLocation,
}: PickupLocationSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          {t('marketplace:create.exactPickupPinLabel')}
        </label>
        <MapLocationPicker value={coords ?? null} onChange={onChange} height="240px" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          {t('marketplace:create.pickupAreaLabel')}
        </label>
        <input
          type="text"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          maxLength={120}
          placeholder={t('marketplace:create.pickupAreaPlaceholder')}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
        />
        <p className="text-xs text-zinc-500 mt-1">{t('marketplace:create.pickupNote')}</p>
      </div>
    </div>
  );
}
