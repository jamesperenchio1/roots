import type { MetadataRoute } from 'next';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { BROWSE_CATEGORIES } from '@/lib/categories';
import { ALL_SPECIES } from '@/data/speciesDatabase';

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://roots-rho-two.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/browse`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/market`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/shipping-guide`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/provenance`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const speciesRoutes: MetadataRoute.Sitemap = ALL_SPECIES.map((s) => ({
    url: `${BASE_URL}/species/${s.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = BROWSE_CATEGORIES.map((c) => ({
    url: `${BASE_URL}/browse/${c}`,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  try {
    const supabase = createSupabasePublicClient();

    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, seller_id, updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw error;

    const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
      url: `${BASE_URL}/listing/${l.id}`,
      lastModified: l.updated_at ? new Date(l.updated_at as string) : undefined,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    // Only sellers with something for sale get a public profile entry.
    const sellerIds = Array.from(new Set((listings ?? []).map((l) => l.seller_id as string)));
    const sellerRoutes: MetadataRoute.Sitemap = sellerIds.map((id) => ({
      url: `${BASE_URL}/seller/${id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...speciesRoutes, ...listingRoutes, ...sellerRoutes];
  } catch {
    return [...staticRoutes, ...categoryRoutes, ...speciesRoutes];
  }
}
