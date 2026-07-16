import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { publicKeys } from '@/lib/queryKeys';
import {
  fetchListingById,
  fetchListings,
  fetchListingsByIds,
  fetchListingsBySeller,
  fetchListingsBySpecies,
  fetchPublicData,
  fetchRecentListings,
  type PublicData,
  type ListingFilters,
  type PaginatedListings,
} from '@/lib/api';
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

export function usePaginatedListings(
  filters: ListingFilters,
  options: { pageSize?: number; enabled?: boolean } = {}
) {
  const { pageSize = 12, enabled = true } = options;
  return useInfiniteQuery<PaginatedListings, Error>({
    queryKey: [...publicKeys.listings(filters), pageSize],
    queryFn: ({ pageParam = 0 }) => fetchListings(filters, { page: pageParam as number, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.page + 1;
      return nextPage * lastPage.pageSize < lastPage.total ? nextPage : undefined;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useRecentListings(limit = 8) {
  return useQuery({
    queryKey: publicKeys.listings({ recent: true, limit }),
    queryFn: () => fetchRecentListings(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useListingsBySeller(sellerId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.listings({ sellerId }),
    queryFn: () => (sellerId ? fetchListingsBySeller(sellerId) : []),
    enabled: !!sellerId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useListingsBySpecies(
  speciesId: string | undefined,
  options: { sizeCategory?: string; scientificName?: string } = {}
) {
  const { sizeCategory, scientificName } = options;
  return useQuery({
    queryKey: publicKeys.listings({ speciesId, sizeCategory, scientificName }),
    queryFn: () =>
      speciesId || scientificName
        ? fetchListingsBySpecies(speciesId || '', { sizeCategory, scientificName })
        : [],
    enabled: !!speciesId || !!scientificName,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useListingsByIds(ids: string[]) {
  const stableIds = useMemo(() => ids.filter(Boolean).sort().join(','), [ids]);
  return useQuery({
    queryKey: publicKeys.listings({ ids: stableIds }),
    queryFn: () => fetchListingsByIds(ids.filter(Boolean)),
    enabled: stableIds.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
