import { useQuery } from '@tanstack/react-query';
import { commentKeys } from '@/lib/queryKeys';
import {
  getCommentsForListing,
  getCommentsForSpecies,
  hydrateCommentsForListing,
  hydrateCommentsForSpecies,
} from '@/lib/api';
import type { Comment } from '@/types';

export function useComments(targetId: string | undefined, isListing: boolean) {
  return useQuery<Comment[]>({
    queryKey: isListing ? commentKeys.forListing(targetId ?? '') : commentKeys.forSpecies(targetId ?? ''),
    queryFn: async () => {
      if (!targetId) return [];
      if (isListing) {
        await hydrateCommentsForListing(targetId);
        return getCommentsForListing(targetId);
      }
      await hydrateCommentsForSpecies(targetId);
      return getCommentsForSpecies(targetId);
    },
    enabled: !!targetId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
