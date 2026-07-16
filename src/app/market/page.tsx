import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { fetchPublicData } from '@/lib/api';
import { publicKeys } from '@/lib/queryKeys';
import MarketPage from '@/page-components/MarketPage';
import type { Metadata } from 'next';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Market Overview',
  description: 'Track plant prices and market trends in Thailand.',
};

export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MarketPage />
    </HydrationBoundary>
  );
}
