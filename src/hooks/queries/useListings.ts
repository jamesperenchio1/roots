import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicKeys } from '@/lib/queryKeys';
import { fetchListingById, fetchPublicData, type PublicData } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Listing } from '@/types';

function selectListings(data: PublicData): Listing[] {
  return data.listings;
}

export function useListings() {
  return useQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
    select: selectListings,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useListing(id: string | undefined) {
  return useQuery<Listing | null>({
    queryKey: publicKeys.listing(id),
    queryFn: () => (id ? fetchListingById(id) : null),
    initialData: () => {
      if (!id) return null;
      const cached = queryClient.getQueryData<PublicData>(publicKeys.all());
      return cached?.listings.find((l) => l.id === id) ?? null;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useActiveListings(category?: string) {
  const { data: listings, ...rest } = useListings();
  const filtered = useMemo(() => {
    if (!listings) return [];
    if (!category || category === 'all') return listings;
    return listings.filter((l) => l.species?.category === category);
  }, [listings, category]);
  return { data: filtered, ...rest };
}
