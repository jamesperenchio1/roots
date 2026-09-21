import { cache } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicKeys } from '@/lib/queryKeys';
import { mapListing, mapProfile } from '@/lib/api';
import ListingPage from '@/page-components/ListingPage';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 60;

type Params = { id: string };

const fetchListing = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  // Single round-trip: embed the seller profile rather than awaiting the
  // listing and then the profile sequentially, which doubled TTFB on this route.
  const { data: row, error } = await supabase
    .from('listings')
    .select('*, seller:profiles(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return null;

  const profiles: Record<string, ReturnType<typeof mapProfile>> = {};
  const embeddedSeller = (row as { seller?: Record<string, unknown> | null }).seller;
  if (embeddedSeller && typeof embeddedSeller.id === 'string') {
    profiles[embeddedSeller.id] = mapProfile(embeddedSeller);
  }

  return await mapListing(row as Record<string, unknown>, profiles);
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) return { title: 'Listing not found' };

  const title = `${listing.species?.common_name_en || listing.species?.scientific_name || 'Plant'} for sale on Roots`;
  const description = listing.description || title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: listing.photos?.[0]?.storage_path ? [{ url: listing.photos[0].storage_path }] : [],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) notFound();

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: publicKeys.listing(id),
    queryFn: () => Promise.resolve(listing),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListingPage />
    </HydrationBoundary>
  );
}
