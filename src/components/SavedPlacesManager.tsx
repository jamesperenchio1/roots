import { useEffect, useState } from 'react';
import { Plus, MapPin, Trash2, Star, Check, LocateFixed, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ProvinceCombobox } from '@/components/ProvinceCombobox';
import MapLocationPicker, { type MapLocationValue } from '@/components/MapLocationPicker';
import type { UserLocation } from '@/types';
import {
  getUserLocations,
  createUserLocation,
  updateUserLocation,
  deleteUserLocation,
  setDefaultUserLocation,
  verifyUserLocationWithGps,
  confirmUserLocationOnMap,
  haversineMeters,
} from '@/lib/locations';
import { getProvinceOptions } from '@/lib/provinces';
import { useTranslation } from 'react-i18next';

export default function SavedPlacesManager() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['common', 'auth', 'marketplace']);
  const [places, setPlaces] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<UserLocation | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [province, setProvince] = useState('');
  const [pin, setPin] = useState<MapLocationValue | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [verifyingGps, setVerifyingGps] = useState(false);

  const provinceOptions = getProvinceOptions(i18n.language);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserLocations(user.id);
      setPlaces(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:savedPlaces.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const resetForm = () => {
    setName('');
    setAddressLine('');
    setProvince('');
    setPin(null);
    setIsDefault(false);
    setEditing(null);
    setIsAdding(false);
    setVerifyingGps(false);
  };

  const startEdit = (p: UserLocation) => {
    setEditing(p);
    setName(p.name);
    setAddressLine(p.address_line || '');
    setProvince(p.province || '');
    setPin(p.lat && p.lng ? { lat: p.lat, lng: p.lng, address: p.address_line } : null);
    setIsDefault(p.is_default);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error(t('common:savedPlaces.errors.nameRequired'));
      return;
    }
    if (!pin) {
      toast.error(t('common:savedPlaces.errors.pinRequired'));
      return;
    }
    try {
      const input = {
        profile_id: user.id,
        name: name.trim(),
        address_line: addressLine.trim() || pin.address,
        province,
        lat: pin.lat,
        lng: pin.lng,
        is_default: isDefault,
      };
      if (editing) {
        await updateUserLocation(editing.id, input);
      } else {
        await createUserLocation(input);
      }
      toast.success(editing ? t('common:savedPlaces.updated') : t('common:savedPlaces.saved'));
      resetForm();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:savedPlaces.errors.saveFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUserLocation(id);
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      toast.success(t('common:savedPlaces.removed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:savedPlaces.errors.removeFailed'));
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      await setDefaultUserLocation(user.id, id);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:savedPlaces.errors.setDefaultFailed'));
    }
  };

  const handleVerifyGps = async (place: UserLocation) => {
    if (!place.lat || !place.lng) return;
    setVerifyingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const device = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const distance = haversineMeters({ lat: place.lat!, lng: place.lng! }, device);
          if (distance > 500) {
            toast.error(t('common:savedPlaces.errors.tooFar', { distance: Math.round(distance) }));
          } else {
            await verifyUserLocationWithGps(place.id, device);
            toast.success(t('common:savedPlaces.verifiedGps'));
            refresh();
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('common:savedPlaces.errors.verificationFailed'));
        } finally {
          setVerifyingGps(false);
        }
      },
      () => {
        toast.error(t('common:savedPlaces.errors.gpsFailed'));
        setVerifyingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirmMap = async (place: UserLocation) => {
    try {
      await confirmUserLocationOnMap(place.id);
      toast.success(t('common:savedPlaces.confirmedMap'));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:savedPlaces.errors.confirmFailed'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('common:savedPlaces.title')}</h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-medium px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> {t('common:savedPlaces.addPlace')}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-zinc-900/30 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('common:savedPlaces.placeName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('common:savedPlaces.placeNamePlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('auth:signup.location')}</label>
              <ProvinceCombobox value={province} onChange={setProvince} options={provinceOptions} placeholder={t('marketplace:create.selectProvince')} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">{t('common:savedPlaces.addressArea')}</label>
            <input
              type="text"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder={t('common:savedPlaces.addressPlaceholder')}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">{t('common:savedPlaces.pinOnMap')}</label>
            <MapLocationPicker
              value={pin}
              onChange={setPin}
              onGeocodedAddress={(addr, prov) => {
                if (addr && !addressLine) setAddressLine(addr);
                if (prov && !province) setProvince(prov);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-emerald-500"
            />
            {t('common:savedPlaces.makeDefault')}
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-medium px-3 py-1.5 rounded-lg"
            >
              {editing ? t('common:savedPlaces.update') : t('common:savedPlaces.save')}
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-zinc-500">{t('common:savedPlaces.loading')}</p>}

      <div className="space-y-2">
        {places.map((place) => (
          <div key={place.id} className="flex items-start justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{place.name}</p>
                  {place.is_default && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  {place.verified_at && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                <p className="text-xs text-zinc-500">
                  {place.address_line || place.province || t('common:savedPlaces.noAddress')}
                  {place.lat && place.lng && ` · ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!place.is_default && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(place.id)}
                  title={t('common:savedPlaces.setDefault')}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              {!place.verified_at && (
                <>
                  <button
                    type="button"
                    onClick={() => handleVerifyGps(place)}
                    disabled={verifyingGps}
                    title={t('common:savedPlaces.verifyGps')}
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-white/5 rounded disabled:opacity-50"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmMap(place)}
                    title={t('common:savedPlaces.confirmOnMap')}
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-white/5 rounded"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => startEdit(place)}
                title={t('common:actions.edit')}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(place.id)}
                title={t('common:actions.delete')}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!loading && places.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-6">{t('common:savedPlaces.empty')}</p>
        )}
      </div>
    </div>
  );
}
