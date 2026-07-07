import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Check } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { searchNominatim, reverseGeocode, type NominatimResult } from '@/lib/locations';

export interface MapLocationValue {
  lat: number;
  lng: number;
  address?: string;
}

interface MapLocationPickerProps {
  value?: MapLocationValue | null;
  onChange: (value: MapLocationValue) => void;
  height?: string;
}

const pinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function MapLocationPicker({ value, onChange, height = '240px' }: MapLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<MapLocationValue | null>(value || null);

  const centerMap = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], 16);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true })
        .addTo(mapRef.current)
        .on('dragend', (e) => {
          const m = e.target as L.Marker;
          const { lat, lng } = m.getLatLng();
          updatePick(lat, lng);
        });
    }
  };

  const updatePick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    const next = { lat, lng, address: address || undefined };
    setPicked(next);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initLat = value?.lat ?? 13.7563;
    const initLng = value?.lng ?? 100.5018;
    const map = L.map(containerRef.current).setView([initLat, initLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      centerMap(lat, lng);
      updatePick(lat, lng);
    });
    mapRef.current = map;
    if (value?.lat && value?.lng) {
      centerMap(value.lat, value.lng);
    }
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const hits = await searchNominatim(query);
    setResults(hits);
    setSearching(false);
  };

  const selectResult = (hit: NominatimResult) => {
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    centerMap(lat, lng);
    const next = { lat, lng, address: hit.display_name };
    setPicked(next);
    setResults([]);
    setQuery('');
  };

  const handleConfirm = () => {
    if (!picked) return;
    onChange(picked);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search address or landmark"
          className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-20 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded disabled:opacity-50"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-zinc-900 border border-white/10 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
          {results.map((hit, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(hit)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 border-b border-white/5 last:border-0"
            >
              {hit.display_name}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} style={{ height }} className="w-full rounded-xl overflow-hidden border border-white/10 bg-zinc-900" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          {picked ? (
            <span>{picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}</span>
          ) : (
            <span>Click the map or search to set a pin</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!picked}
          className="inline-flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-medium px-3 py-1.5 rounded-lg"
        >
          <Check className="w-3.5 h-3.5" /> Confirm pin
        </button>
      </div>

      {picked?.address && (
        <p className="text-xs text-zinc-500 line-clamp-2">{picked.address}</p>
      )}
    </div>
  );
}
