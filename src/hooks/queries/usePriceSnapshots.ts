import { useQuery } from '@tanstack/react-query';
import { fetchPriceSnapshotsForSpecies } from '@/lib/api';
import { publicKeys } from '@/lib/queryKeys';
import type { PriceSnapshot } from '@/types';

export function usePriceSnapshots(speciesId: string | undefined, sizeCategory?: string, days = 90) {
  return useQuery<PriceSnapshot[]>({
    queryKey: publicKeys.priceSnapshots(speciesId, sizeCategory),
    queryFn: () => (speciesId ? fetchPriceSnapshotsForSpecies(speciesId, sizeCategory, days) : []),
    enabled: !!speciesId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
