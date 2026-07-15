import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PRICE_SNAPSHOTS,
  LISTINGS,
  TRANSACTIONS,
  getMarketOverview,
  subscribePriceSnapshots,
  getPriceSnapshotsVersion,
  bumpPriceSnapshots,
} from '@/data/mockData';

function resetStores() {
  PRICE_SNAPSHOTS.length = 0;
  LISTINGS.length = 0;
  TRANSACTIONS.length = 0;
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

describe('getMarketOverview', () => {
  beforeEach(() => {
    resetStores();
  });

  it('returns empty overview when no data exists', () => {
    const overview = getMarketOverview();
    expect(overview.trending_up).toEqual([]);
    expect(overview.trending_down).toEqual([]);
    expect(overview.most_traded).toEqual([]);
    expect(overview.hot_right_now).toEqual([]);
    expect(overview.cold).toEqual([]);
    expect(overview.high_value_sales).toEqual([]);
  });

  it('identifies trending up species when price increased > 5%', () => {
    // Populate previous 30-day window with a lower median so percent_change > 5.
    for (let i = 31; i <= 60; i++) {
      const date = dateDaysAgo(i);
      PRICE_SNAPSHOTS.push({ id: `ps-prev-${i}`, species_id: 'sp-aroid-1', size_category: null, snapshot_date: date, median_price_thb: 100, mean_price_thb: 100, min_price_thb: 90, max_price_thb: 110, sale_count: 1, created_at: date });
    }
    PRICE_SNAPSHOTS.push({ id: 'ps-cur', species_id: 'sp-aroid-1', size_category: null, snapshot_date: dateDaysAgo(1), median_price_thb: 110, mean_price_thb: 110, min_price_thb: 100, max_price_thb: 120, sale_count: 5, created_at: dateDaysAgo(1) });
    const overview = getMarketOverview();
    expect(overview.trending_up).toHaveLength(1);
    expect(overview.trending_up[0].species.id).toBe('sp-aroid-1');
    expect(overview.trending_up[0].percent_change).toBeGreaterThan(5);
  });

  it('identifies trending down species when price decreased < -3%', () => {
    for (let i = 31; i <= 60; i++) {
      const date = dateDaysAgo(i);
      PRICE_SNAPSHOTS.push({ id: `ps-prev-${i}`, species_id: 'sp-aroid-1', size_category: null, snapshot_date: date, median_price_thb: 100, mean_price_thb: 100, min_price_thb: 90, max_price_thb: 110, sale_count: 1, created_at: date });
    }
    PRICE_SNAPSHOTS.push({ id: 'ps-cur', species_id: 'sp-aroid-1', size_category: null, snapshot_date: dateDaysAgo(1), median_price_thb: 90, mean_price_thb: 90, min_price_thb: 80, max_price_thb: 100, sale_count: 5, created_at: dateDaysAgo(1) });
    const overview = getMarketOverview();
    expect(overview.trending_down).toHaveLength(1);
    expect(overview.trending_down[0].species.id).toBe('sp-aroid-1');
    expect(overview.trending_down[0].percent_change).toBeLessThan(-3);
  });

  it('ranks most_traded by sales count', () => {
    PRICE_SNAPSHOTS.push(
      { id: 'ps-1', species_id: 'sp-aroid-1', size_category: null, snapshot_date: dateDaysAgo(1), median_price_thb: 100, mean_price_thb: 100, min_price_thb: 90, max_price_thb: 110, sale_count: 10, created_at: dateDaysAgo(1) },
      { id: 'ps-2', species_id: 'sp-hoya-1', size_category: null, snapshot_date: dateDaysAgo(1), median_price_thb: 100, mean_price_thb: 100, min_price_thb: 90, max_price_thb: 110, sale_count: 20, created_at: dateDaysAgo(1) },
    );
    const overview = getMarketOverview();
    expect(overview.most_traded.map(t => t.species.id)).toEqual(['sp-hoya-1', 'sp-aroid-1']);
  });

  it('filters high-value sales to completed transactions >= 5000 THB', () => {
    const now = new Date().toISOString();
    TRANSACTIONS.push(
      { id: 'tx-1', listing_id: 'l-1', buyer_id: 'b-1', seller_id: 's-1', plant_id: 'p-1', sale_price_thb: 6000, platform_fee_thb: 480, seller_payout_thb: 5520, status: 'completed', delivery_method: 'ship', created_at: now },
      { id: 'tx-2', listing_id: 'l-2', buyer_id: 'b-1', seller_id: 's-1', plant_id: 'p-2', sale_price_thb: 4000, platform_fee_thb: 320, seller_payout_thb: 3680, status: 'completed', delivery_method: 'ship', created_at: now },
      { id: 'tx-3', listing_id: 'l-3', buyer_id: 'b-1', seller_id: 's-1', plant_id: 'p-3', sale_price_thb: 7000, platform_fee_thb: 560, seller_payout_thb: 6440, status: 'pending_payment', delivery_method: 'ship', created_at: now },
    );
    const overview = getMarketOverview();
    expect(overview.high_value_sales).toHaveLength(1);
    expect(overview.high_value_sales[0].id).toBe('tx-1');
  });
});

describe('price snapshot subscription helpers', () => {
  beforeEach(() => {
    resetStores();
  });

  it('returns initial version of zero', () => {
    expect(getPriceSnapshotsVersion()).toBe(0);
  });

  it('notifies subscribers when bumped', () => {
    const cb = vi.fn();
    const unsubscribe = subscribePriceSnapshots(cb);
    bumpPriceSnapshots();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getPriceSnapshotsVersion()).toBe(1);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const cb = vi.fn();
    const unsubscribe = subscribePriceSnapshots(cb);
    unsubscribe();
    bumpPriceSnapshots();
    expect(cb).not.toHaveBeenCalled();
  });
});
