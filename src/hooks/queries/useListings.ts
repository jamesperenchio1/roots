import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicKeys } from '@/lib/queryKeys';
import { fetchPublicData, type PublicData } from '@/lib/api';
import type { Listing } from '@/types';

function selectListings(data: PublicData): Listing[] {
  return data.listings;
}

function selectListing(id: string | undefined) {
  return (data: PublicData): Listing | undefined => {
    if (!id) return undefined;
    return data.listings.find((l) => l.id === id);
  };
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
  return useQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
    select: selectListing(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
