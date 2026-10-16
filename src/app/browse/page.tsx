import { Suspense } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { fetchListings } from '@/lib/api';
import { publicKeys } from '@/lib/queryKeys';
import BrowsePage from '@/page-components/BrowsePage';
import type { Metadata } from 'next';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Browse Plants',
  description: 'Find rare plants for sale in Thailand.',
};

const PAGE_SIZE = 12;

export default async function Page() {
  // Prefetch the unfiltered first page. Its key mirrors BrowsePage's client key for an empty URL.
  const queryClient = new QueryClient();
  const filters = { category: '' as const, size: '' as const, province: '', minPrice: undefined, maxPrice: undefined, q: '', sortBy: 'newest' as const };
  await queryClient.prefetchInfiniteQuery({
    queryKey: [...publicKeys.listings(filters), PAGE_SIZE],
    queryFn: () => fetchListings(filters, { page: 0, pageSize: PAGE_SIZE }),
    initialPageParam: { page: 0, boostedIds: [] as string[] },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <BrowsePage />
      </Suspense>
    </HydrationBoundary>
  );
}
