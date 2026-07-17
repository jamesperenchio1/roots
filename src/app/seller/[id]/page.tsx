import { cache } from 'react';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicKeys } from '@/lib/queryKeys';
import { mapListing, mapProfile } from '@/lib/api';
import SellerPage from '@/page-components/SellerPage';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 120;

type Params = { id: string };

export async function generateStaticParams() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .limit(50);
  return (data ?? []).map((row) => ({ id: row.id }));
}

const fetchSellerData = cache(async (id: string) => {
  const supabase = await createSupabaseServerClient();
  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !profileRow) return null;

  const profile = mapProfile(profileRow as Record<string, unknown>);
  const { data: listingRows } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('seller_id', id)
    .order('created_at', { ascending: false });

  const profileMap = { [id]: profile };
  const listings = await Promise.all(
    (listingRows || []).map((r) => mapListing(r as Record<string, unknown>, profileMap))
  );

  return { profile, listings };
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchSellerData(id);
  if (!data) return { title: 'Seller not found' };

  const { profile } = data;
  return {
    title: `${profile.display_name}'s Shop`,
    description: `Plants by ${profile.display_name}`,
    openGraph: {
      title: `${profile.display_name}'s Shop`,
      description: `Plants by ${profile.display_name}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const data = await fetchSellerData(id);
  if (!data) notFound();

  const { profile, listings } = data;
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: publicKeys.seller(id),
      queryFn: () => Promise.resolve(profile),
    }),
    queryClient.prefetchQuery({
      queryKey: publicKeys.listings({ sellerId: id }),
      queryFn: () => Promise.resolve(listings),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SellerPage />
    </HydrationBoundary>
  );
}
