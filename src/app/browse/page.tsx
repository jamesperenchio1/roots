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

export default async function Page() {
  const queryClient = new QueryClient();
  const filters = {};
  const pageSize = 12;
  await queryClient.prefetchQuery({
    queryKey: [...publicKeys.listings(filters), pageSize],
    queryFn: () => fetchListings(filters, { page: 0, pageSize }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={null}>
        <BrowsePage />
      </Suspense>
    </HydrationBoundary>
  );
}
