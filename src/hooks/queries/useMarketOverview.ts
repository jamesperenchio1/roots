import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicKeys } from '@/lib/queryKeys';
import { fetchPublicData, getMarketOverviewFromData } from '@/lib/api';
import type { MarketOverview } from '@/types';

export function useMarketOverview() {
  const { data, ...rest } = useQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const overview = useMemo<MarketOverview | undefined>(() => {
    if (!data) return undefined;
    return getMarketOverviewFromData(data);
  }, [data]);

  return { data: overview, ...rest };
}
