import { useQuery } from '@tanstack/react-query';
import { fetchPublicData } from '@/lib/api';
import { publicKeys } from '@/lib/queryKeys';

export function usePublicData() {
  return useQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
