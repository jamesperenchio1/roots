import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicKeys } from '@/lib/queryKeys';
import { mapListing, mapProfile, mapPriceSnapshot } from '@/lib/api';
import { getSpeciesById } from '@/data/mockData';
import SpeciesPage from '@/page-components/SpeciesPage';
import type { Metadata } from 'next';

export const revalidate = 300;

type Params = { id: string };

async function fetchSpeciesData(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data: listingRows } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('species_id', id)
    .order('created_at', { ascending: false });

  const sellerIds = new Set((listingRows || []).map((r) => (r as { seller_id: string }).seller_id));
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*')
    .in('id', Array.from(sellerIds));

  const profileMap = Object.fromEntries(
    (profileRows || []).map((r) => [(r as { id: string }).id, mapProfile(r as Record<string, unknown>)])
  );
  const listings = await Promise.all(
    (listingRows || []).map((r) => mapListing(r as Record<string, unknown>, profileMap))
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const { data: snapshotRows } = await supabase
    .from('price_snapshots')
    .select('*')
    .eq('species_id', id)
    .gte('snapshot_date', cutoff.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });
  const snapshots = (snapshotRows || []).map((r) => mapPriceSnapshot(r as Record<string, unknown>));

  return { listings, snapshots };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const rawId = decodeURIComponent(id).trim();
  const species = getSpeciesById(rawId);
  const title = species?.common_name_en || species?.scientific_name || rawId;
  const description = species?.description || `Species information for ${title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: species?.image_url ? [{ url: species.image_url }] : [],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const { listings, snapshots } = await fetchSpeciesData(id);

  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: publicKeys.listings({ speciesId: id, sizeCategory: undefined, scientificName: undefined }),
      queryFn: () => Promise.resolve(listings),
    }),
    queryClient.prefetchQuery({
      queryKey: publicKeys.priceSnapshots(id, undefined),
      queryFn: () => Promise.resolve(snapshots),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SpeciesPage />
    </HydrationBoundary>
  );
}
