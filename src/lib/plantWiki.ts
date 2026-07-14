export interface GbifSpecies {
  key: number;
  scientificName: string;
  canonicalName?: string;
  rank?: string;
  kingdom?: string;
  phylum?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
}

export interface INaturalistPhoto {
  id?: number;
  url?: string;
  medium_url?: string;
  square_url?: string;
  attribution?: string;
}

export interface INaturalistTaxon {
  id: number;
  name: string;
  rank?: string;
  preferred_common_name?: string;
  wikipedia_summary?: string;
  default_photo?: INaturalistPhoto | null;
  taxon_photos?: Array<{ photo: INaturalistPhoto }>;
  ancestors?: Array<{ id: number; name: string; rank: string }>;
}

export interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
  pageid?: number;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchGbifSpecies(scientificName: string): Promise<GbifSpecies | null> {
  const data = await fetchJson<{ results?: Array<Record<string, unknown>> }>(
    `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(scientificName)}&limit=1`
  );
  const result = data?.results?.[0];
  if (!result) return null;

  const pickString = (key: string) => (typeof result[key] === 'string' ? (result[key] as string) : undefined);

  return {
    key: (result.key as number) ?? 0,
    scientificName: (result.scientificName as string) || scientificName,
    canonicalName: pickString('canonicalName'),
    rank: pickString('rank'),
    kingdom: pickString('kingdom'),
    phylum: pickString('phylum'),
    order: pickString('order'),
    family: pickString('family'),
    genus: pickString('genus'),
    species: pickString('species'),
  };
}

export async function fetchINaturalistTaxon(scientificName: string): Promise<INaturalistTaxon | null> {
  const data = await fetchJson<{ results?: Array<Record<string, unknown>> }>(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&limit=1`
  );
  const result = data?.results?.[0];
  if (!result) return null;

  return {
    id: (result.id as number) ?? 0,
    name: (result.name as string) || scientificName,
    rank: typeof result.rank === 'string' ? result.rank : undefined,
    preferred_common_name: typeof result.preferred_common_name === 'string' ? result.preferred_common_name : undefined,
    wikipedia_summary: typeof result.wikipedia_summary === 'string' ? result.wikipedia_summary : undefined,
    default_photo: (result.default_photo as INaturalistPhoto | null | undefined) ?? undefined,
    taxon_photos: Array.isArray(result.taxon_photos) ? (result.taxon_photos as Array<{ photo: INaturalistPhoto }>) : undefined,
    ancestors: Array.isArray(result.ancestors)
      ? (result.ancestors as Array<{ id: number; name: string; rank: string }>)
      : undefined,
  };
}

export async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  const data = await fetchJson<Record<string, unknown>>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  );
  if (!data || data.type === 'disambiguation' || typeof data.extract !== 'string' || !data.extract) {
    return null;
  }

  return {
    title: (data.title as string) || title,
    extract: data.extract,
    description: typeof data.description === 'string' ? data.description : undefined,
    thumbnail: data.thumbnail as WikipediaSummary['thumbnail'] | undefined,
    pageid: typeof data.pageid === 'number' ? data.pageid : undefined,
  };
}
