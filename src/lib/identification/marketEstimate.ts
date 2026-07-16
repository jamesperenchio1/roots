import type { CombinedResult } from './types';
import type { Listing, MarketEstimate, PriceSnapshot } from '@/types';
import { getSpeciesById } from '@/data/mockData';
import { ALL_SPECIES } from '@/data/speciesDatabase';
import { getPriceSnapshotsForSpeciesFromData, getSpeciesPriceStatsFromData } from '@/lib/api';

export interface MarketEstimateData {
  listings: Listing[];
  priceSnapshots: PriceSnapshot[];
}

export function buildMarketEstimate(
  result: CombinedResult,
  marketData: MarketEstimateData
): Omit<MarketEstimate, 'id' | 'result_id' | 'created_at'> {
  const species = getSpeciesById(result.scientific_name) || ALL_SPECIES.find((s) => s.scientific_name.toLowerCase() === result.scientific_name.toLowerCase());
  const speciesId = species?.id;

  if (!speciesId) {
    return {
      species_id: undefined,
      avg_asking_price: undefined,
      median_price: undefined,
      lowest_active: undefined,
      highest_active: undefined,
      recent_sales_count: 0,
      trend_percent: undefined,
      suggested_range_low: undefined,
      suggested_range_high: undefined,
      confidence: 'low',
      data_sufficient: false,
    };
  }

  const active = marketData.listings.filter(
    (l) => l.status === 'active' && l.species?.id === speciesId
  );
  const stats30 = getSpeciesPriceStatsFromData(marketData.priceSnapshots, marketData.listings, speciesId, 30);
  const stats90 = getSpeciesPriceStatsFromData(marketData.priceSnapshots, marketData.listings, speciesId, 90);
  const snapshots90 = getPriceSnapshotsForSpeciesFromData(marketData.priceSnapshots, speciesId, undefined, 90);
  const snapshots180 = getPriceSnapshotsForSpeciesFromData(marketData.priceSnapshots, speciesId, undefined, 180);

  const avgAsking = active.length > 0
    ? Math.round(active.reduce((s, l) => s + l.price_thb, 0) / active.length)
    : undefined;
  const lowest = active.length > 0 ? Math.min(...active.map((l) => l.price_thb)) : undefined;
  const highest = active.length > 0 ? Math.max(...active.map((l) => l.price_thb)) : undefined;

  const median = stats30?.median ?? stats90?.median ?? avgAsking;
  const recentSales = stats30?.totalSales ?? 0;

  const prevMedian = snapshots180.length > snapshots90.length
    ? Math.round(snapshots180.slice(snapshots90.length).reduce((s, p) => s + p.median_price_thb, 0) / (snapshots180.length - snapshots90.length))
    : (stats90?.median ?? median);
  const trend = median && prevMedian ? ((median - prevMedian) / prevMedian) * 100 : undefined;

  let suggestedLow: number | undefined;
  let suggestedHigh: number | undefined;
  if (median) {
    suggestedLow = Math.round(median * 0.85);
    suggestedHigh = Math.round(median * 1.15);
  }

  const dataSufficient = active.length >= 3 || recentSales >= 1;

  // Fallback to catalogue range if no marketplace data exists.
  if (!dataSufficient && 'price_range_low' in species && 'price_range_high' in species) {
    const s = species as typeof ALL_SPECIES[0];
    suggestedLow = s.price_range_low;
    suggestedHigh = s.price_range_high;
  }

  const confidence: MarketEstimate['confidence'] = dataSufficient
    ? recentSales >= 5 ? 'high' : 'medium'
    : active.length > 0 ? 'low' : 'low';

  return {
    species_id: speciesId,
    avg_asking_price: avgAsking,
    median_price: median,
    lowest_active: lowest,
    highest_active: highest,
    recent_sales_count: recentSales,
    trend_percent: trend,
    suggested_range_low: suggestedLow,
    suggested_range_high: suggestedHigh,
    confidence,
    data_sufficient: dataSufficient,
  };
}
