import { useQuery } from '@tanstack/react-query';
import { publicKeys } from '@/lib/queryKeys';
import { fetchProfile } from '@/lib/api';
import type { Profile } from '@/types';

export function useSeller(id: string | undefined) {
  return useQuery<Profile | undefined>({
    queryKey: publicKeys.seller(id),
    queryFn: async () => {
      if (!id) return undefined;
      return (await fetchProfile(id)) ?? undefined;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
