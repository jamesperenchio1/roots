import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { fetchPublicData, fetchRecentListings } from '@/lib/api';
import { publicKeys } from '@/lib/queryKeys';
import HomePage from '@/page-components/HomePage';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Roots — Thai Plant Marketplace',
  description: 'Buy and sell rare plants in Thailand.',
};

export default async function Page() {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: publicKeys.all(),
      queryFn: fetchPublicData,
    }),
    queryClient.prefetchQuery({
      queryKey: publicKeys.listings({ recent: true, limit: 8 }),
      queryFn: () => fetchRecentListings(8),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePage />
    </HydrationBoundary>
  );
}
