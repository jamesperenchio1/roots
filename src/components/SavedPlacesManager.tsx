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
  const { i18n } = useTranslation();
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
      toast.error(err instanceof Error ? err.message : 'Could not load saved places');
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
      toast.error('Please give this place a name');
      return;
    }
    if (!pin) {
      toast.error('Please set a pin on the map');
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
      toast.success(editing ? 'Place updated' : 'Place saved');
      resetForm();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save place');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUserLocation(id);
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      toast.success('Place removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove place');
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      await setDefaultUserLocation(user.id, id);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not set default');
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
            toast.error(`You are ${Math.round(distance)} m away. Must be within 500 m to verify.`);
          } else {
            await verifyUserLocationWithGps(place.id, device);
            toast.success('Location verified by GPS');
            refresh();
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Verification failed');
        } finally {
          setVerifyingGps(false);
        }
      },
      () => {
        toast.error('Could not get your device location');
        setVerifyingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirmMap = async (place: UserLocation) => {
    try {
      await confirmUserLocationOnMap(place.id);
      toast.success('Location confirmed on map');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Saved places</h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-medium px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add place
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-zinc-900/30 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Place name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Home, Shop, Greenhouse..."
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Province</label>
              <ProvinceCombobox value={province} onChange={setProvince} options={provinceOptions} placeholder="Select province" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Address / area</label>
            <input
              type="text"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="e.g. Chatuchak Market, Bangkok"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Pin on map</label>
            <MapLocationPicker value={pin} onChange={setPin} />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-emerald-500"
            />
            Make this my default pickup place
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-medium px-3 py-1.5 rounded-lg"
            >
              {editing ? 'Update place' : 'Save place'}
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-zinc-500">Loading places…</p>}

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
                  {place.address_line || place.province || 'No address'}
                  {place.lat && place.lng && ` · ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!place.is_default && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(place.id)}
                  title="Set default"
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
                    title="Verify with current GPS location"
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-white/5 rounded disabled:opacity-50"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmMap(place)}
                    title="Confirm on map"
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-white/5 rounded"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => startEdit(place)}
                title="Edit"
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(place.id)}
                title="Delete"
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!loading && places.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-6">No saved places yet.</p>
        )}
      </div>
    </div>
  );
}
