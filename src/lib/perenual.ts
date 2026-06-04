const BASE_URL = 'https://perenual.com/api';

export interface PerenualPlant {
  id: number;
  common_name: string;
  scientific_name: string[];
  watering: string;
  sunlight: string[];
  care_level?: string;
  description?: string;
  default_image?: { thumbnail: string };
}

export interface PerenualCareGuide {
  species_id: number;
  common_name: string;
  scientific_name: string[];
  section: Array<{
    id: string;
    type: string;
    description: string;
  }>;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function searchPerenualPlants(query: string): Promise<PerenualPlant[]> {
  const cacheKey = `search:${query}`;
  const cached = getCache<PerenualPlant[]>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/species-list?key=&q=${encodeURIComponent(query)}&page=1`;
  const data = await fetchJson<{ data: PerenualPlant[] }>(url);
  const plants = data?.data ?? [];
  setCache(cacheKey, plants);
  return plants;
}

export async function getPerenualPlantDetails(id: number): Promise<PerenualPlant | null> {
  const cacheKey = `details:${id}`;
  const cached = getCache<PerenualPlant>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/species/details/${id}?key=`;
  const data = await fetchJson<PerenualPlant>(url);
  if (data) setCache(cacheKey, data);
  return data;
}

export async function getCareGuide(speciesId: number): Promise<PerenualCareGuide | null> {
  const cacheKey = `care:${speciesId}`;
  const cached = getCache<PerenualCareGuide>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/species-care-guide-list?key=&species_id=${speciesId}&page=1`;
  const data = await fetchJson<{ data: PerenualCareGuide[] }>(url);
  const guide = data?.data?.[0] ?? null;
  if (guide) setCache(cacheKey, guide);
  return guide;
}

export function wateringToIcon(level: string): string {
  const map: Record<string, string> = {
    'Frequent': 'Every 3-4 days',
    'Average': 'Weekly',
    'Minimum': 'Every 2-3 weeks',
    'None': 'Rarely',
  };
  return map[level] ?? level;
}

export function sunlightToEmoji(sun: string[]): string {
  if (!sun || sun.length === 0) return '☀️';
  const joined = sun.map(s => s.toLowerCase()).join(' ');
  if (joined.includes('full sun')) return '☀️☀️';
  if (joined.includes('part shade') || joined.includes('partial sun')) return '⛅';
  if (joined.includes('shade')) return '🌥️';
  if (joined.includes('indirect')) return '🪟';
  return '☀️';
}
