import { useQuery } from '@tanstack/react-query';
import { userKeys } from '@/lib/queryKeys';
import { fetchSellerListings } from '@/lib/api';
import { LISTINGS } from '@/data/mockData';
import type { Listing } from '@/types';

export function useSellerListings(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<Listing[]>({
    queryKey: userKeys.sellerListings(keyUserId),
    queryFn: () => (userId ? fetchSellerListings(userId) : []),
    initialData: () => (userId ? LISTINGS.filter((l) => l.seller_id === userId) : []),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
