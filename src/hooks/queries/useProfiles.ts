import { useQuery } from '@tanstack/react-query';
import { fetchProfiles } from '@/lib/api';
import { publicKeys } from '@/lib/queryKeys';

export function useProfiles() {
  return useQuery({
    queryKey: publicKeys.listings({ allProfiles: true }),
    queryFn: fetchProfiles,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
