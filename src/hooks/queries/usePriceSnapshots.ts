import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicKeys } from '@/lib/queryKeys';
import { fetchPublicData } from '@/lib/api';
import type { PriceSnapshot } from '@/types';

export function usePriceSnapshots(speciesId: string | undefined, sizeCategory?: string, days = 90) {
  const { data, ...rest } = useQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const snapshots = useMemo<PriceSnapshot[]>(() => {
    if (!data || !speciesId) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return data.priceSnapshots
      .filter(
        (ps) =>
          ps.species_id === speciesId &&
          (sizeCategory ? ps.size_category === sizeCategory : ps.size_category == null) &&
          new Date(ps.snapshot_date) >= cutoff
      )
      .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
  }, [data, speciesId, sizeCategory, days]);

  return { data: snapshots, ...rest };
}
