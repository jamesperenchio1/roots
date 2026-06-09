import type { ExternalListing, ScrapedPriceSnapshot } from '@/types/external';

let cachedListings: ExternalListing[] | null = null;
let cachedSnapshots: ScrapedPriceSnapshot[] | null = null;

export function getScrapedListings(): ExternalListing[] {
  if (cachedListings) return cachedListings;
  try {
    // In production, this could fetch from Supabase instead
    const raw = import.meta.glob('./scraped_listings.json', { eager: true, import: 'default' });
    const data = Object.values(raw)[0] as ExternalListing[] | undefined;
    cachedListings = data || [];
  } catch {
    cachedListings = [];
  }
  return cachedListings;
}

export function getScrapedPriceSnapshots(): ScrapedPriceSnapshot[] {
  if (cachedSnapshots) return cachedSnapshots;
  try {
    const raw = import.meta.glob('./scraped_prices.json', { eager: true, import: 'default' });
    const data = Object.values(raw)[0] as ScrapedPriceSnapshot[] | undefined;
    cachedSnapshots = data || [];
  } catch {
    cachedSnapshots = [];
  }
  return cachedSnapshots;
}

export function getExternalListingsByCategory(category?: string): ExternalListing[] {
  const all = getScrapedListings();
  if (!category) return all;
  return all.filter(l => l.category === category || l.category_hint === category);
}

export function getExternalPriceSnapshots(speciesIdPrefix?: string): ScrapedPriceSnapshot[] {
  const all = getScrapedPriceSnapshots();
  if (!speciesIdPrefix) return all;
  return all.filter(s => s.species_id.startsWith(speciesIdPrefix));
}
