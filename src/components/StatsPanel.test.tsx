import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsPanel } from './StatsPanel';
import * as usePriceSnapshotsModule from '@/hooks/queries/usePriceSnapshots';
import * as useListingsModule from '@/hooks/queries/useListings';
import type { PriceSnapshot } from '@/types';

vi.mock('@/hooks/queries/usePriceSnapshots', () => ({
  usePriceSnapshots: vi.fn(),
}));

vi.mock('@/hooks/queries/useListings', () => ({
  useListingsBySpecies: vi.fn(),
}));

const mockUsePriceSnapshots = vi.mocked(usePriceSnapshotsModule.usePriceSnapshots);
const mockUseListingsBySpecies = vi.mocked(useListingsModule.useListingsBySpecies);

describe('StatsPanel', () => {
  it('renders stats derived from snapshots', () => {
    const snapshots: PriceSnapshot[] = [
      {
        id: 'ps-1',
        species_id: 'sp-1',
        snapshot_date: new Date().toISOString().split('T')[0],
        median_price_thb: 1000,
        mean_price_thb: 1000,
        min_price_thb: 900,
        max_price_thb: 1100,
        sale_count: 2,
        created_at: new Date().toISOString(),
      },
    ];

    mockUsePriceSnapshots.mockReturnValue({ data: snapshots } as ReturnType<typeof usePriceSnapshotsModule.usePriceSnapshots>);
    mockUseListingsBySpecies.mockReturnValue({ data: [] } as ReturnType<typeof useListingsModule.useListingsBySpecies>);

    render(<StatsPanel speciesId="sp-1" fallbackPrice={1200} />);

    expect(screen.getAllByText('1,000 THB').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('falls back to the listing price when no snapshot or live data exists', () => {
    mockUsePriceSnapshots.mockReturnValue({ data: [] } as ReturnType<typeof usePriceSnapshotsModule.usePriceSnapshots>);
    mockUseListingsBySpecies.mockReturnValue({ data: [] } as ReturnType<typeof useListingsModule.useListingsBySpecies>);

    render(<StatsPanel speciesId="sp-1" fallbackPrice={1500} />);

    expect(screen.getAllByText('1,500 THB').length).toBeGreaterThan(0);
  });
});
