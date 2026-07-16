import { useMemo } from 'react';
import { useListingsBySpecies } from '@/hooks/queries/useListings';
import { usePriceSnapshots } from '@/hooks/queries/usePriceSnapshots';
import type { Listing, PriceSnapshot } from '@/types';

export interface SpeciesPriceStats {
  median: number;
  mean: number;
  min: number;
  max: number;
  totalSales: number;
}

export function computeSpeciesPriceStats(
  snapshots: PriceSnapshot[],
  listings: Listing[],
  speciesId: string,
  days: number = 30
): SpeciesPriceStats | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const data = snapshots
    .filter((ps) => ps.species_id === speciesId && new Date(ps.snapshot_date) >= cutoff)
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());

  if (data.length === 0) {
    const live = listings.filter((l) => l.status === 'active' && l.species?.id === speciesId);
    if (live.length === 0) return null;
    const prices = live.map((l) => l.price_thb).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    return { median, mean, min: prices[0], max: prices[prices.length - 1], totalSales: 0 };
  }

  const prices = data.map((d) => d.median_price_thb);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  return {
    median,
    mean,
    min: Math.min(...prices),
    max: Math.max(...prices),
    totalSales: data.reduce((s, d) => s + d.sale_count, 0),
  };
}

export function useSpeciesPriceStats(speciesId: string | undefined, days: number = 30) {
  const { data: snapshots = [] } = usePriceSnapshots(speciesId, undefined, days);
  const { data: listings = [] } = useListingsBySpecies(speciesId);

  return useMemo(
    () => (speciesId ? computeSpeciesPriceStats(snapshots, listings, speciesId, days) : null),
    [snapshots, listings, speciesId, days]
  );
}
