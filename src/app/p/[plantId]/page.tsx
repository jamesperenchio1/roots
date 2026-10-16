import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { mapListing } from '@/lib/api';
import PlantQRPage from '@/page-components/PlantQRPage';

type Params = { plantId: string };

export const revalidate = 300;

// Render on first request, then serve from the ISR cache (no params pre-rendered at build time).
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { plantId } = await params;

  const supabase = createSupabasePublicClient();
  const { data: plantRow } = await supabase
    .from('plants')
    .select('*, listings(*)')
    .eq('id', plantId)
    .maybeSingle();

  if (!plantRow) {
    return {
      title: 'Plant Provenance',
      description: 'Verify the ownership history and authenticity of this plant.',
    };
  }

  const listingRow = (plantRow as Record<string, unknown[]>).listings?.[0] ?? null;
  const listing = listingRow
    ? await mapListing(listingRow as Record<string, unknown>, {})
    : null;

  const speciesName =
    listing?.species?.scientific_name ||
    (plantRow as Record<string, string>).species_name ||
    'Plant';

  const title = `${speciesName} — Provenance Record`;
  const description = `Verified ownership history and authenticity record for this ${speciesName} on Roots.`;
  const image = listing?.photos?.[0]?.storage_path;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, width: 1200, height: 630, alt: speciesName }] : [],
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PlantQRPage />
    </Suspense>
  );
}
