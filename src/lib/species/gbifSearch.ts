import type { SpeciesEntry } from '@/data/speciesDatabase';

export interface GbifSuggestion {
  key: number;
  scientificName: string;
  canonicalName?: string;
  kingdom?: string;
  rank?: string;
}

/**
 * Search GBIF species suggest API and return plant species entries.
 * Returns empty array for short queries or network failures.
 */
export async function searchGbifSpecies(query: string): Promise<SpeciesEntry[]> {
  if (!query || query.length < 3) return [];

  const url = `https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(query)}&rank=SPECIES&limit=8`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('GBIF suggest request failed:', response.status);
      return [];
    }

    const data = (await response.json()) as GbifSuggestion[];
    return data
      .filter(item => item.kingdom === 'Plantae')
      .map(item => ({
        id: `gbif-${item.key}`,
        scientific_name: item.canonicalName || item.scientificName,
        common_name_en: '',
        common_name_th: '',
        synonyms: [],
        category: 'other' as const,
        care_level: 'moderate' as const,
        light_requirement: '',
        water_requirement: '',
        description: '',
        price_range_low: 0,
        price_range_high: 0,
        popularity_score: 0,
      }));
  } catch (error) {
    console.warn('GBIF suggest error:', error);
    return [];
  }
}
