const BASE_URL = 'https://perenual.com/api';
const API_KEY = (import.meta.env.VITE_PERENUAL_API_KEY as string | undefined) || '';

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

  const url = `${BASE_URL}/species-list?key=${API_KEY}&q=${encodeURIComponent(query)}&page=1`;
  const data = await fetchJson<{ data: PerenualPlant[] }>(url);
  const plants = data?.data ?? [];
  setCache(cacheKey, plants);
  return plants;
}

export async function getPerenualPlantDetails(id: number): Promise<PerenualPlant | null> {
  const cacheKey = `details:${id}`;
  const cached = getCache<PerenualPlant>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/species/details/${id}?key=${API_KEY}`;
  const data = await fetchJson<PerenualPlant>(url);
  if (data) setCache(cacheKey, data);
  return data;
}

export async function getCareGuide(speciesId: number): Promise<PerenualCareGuide | null> {
  const cacheKey = `care:${speciesId}`;
  const cached = getCache<PerenualCareGuide>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/species-care-guide-list?key=${API_KEY}&species_id=${speciesId}&page=1`;
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

  // Light ranges that span multiple intensities — show the middle value
  if (joined.includes('full sun to partial')) return '☀️☀️';
  if (joined.includes('low to bright')) return '☀️☀️';

  // High / direct light
  if (joined.includes('full sun') || joined.includes('bright direct') || joined.includes('partial sun')) {
    return '☀️☀️☀️';
  }

  // Medium / indirect light
  if (joined.includes('bright indirect') || joined.includes('medium indirect') || joined.includes('part shade')) {
    return '☀️☀️';
  }

  // Low / shade
  if (joined.includes('shade') || joined.includes('low light')) {
    return '☀️';
  }

  // Unknown but presumably moderate
  return '☀️☀️';
}
