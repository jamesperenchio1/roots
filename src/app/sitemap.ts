import type { MetadataRoute } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SPECIES } from '@/data/mockData';

export const revalidate = 3600;

const BASE_URL = 'https://root.market';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/browse`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/market`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/fees`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/shipping-guide`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/provenance`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const speciesRoutes: MetadataRoute.Sitemap = SPECIES.map((s) => ({
    url: `${BASE_URL}/species/${s.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  try {
    const supabase = await createSupabaseServerClient();

    const [{ data: listings }, { data: sellers }] = await Promise.all([
      supabase
        .from('listings')
        .select('id, updated_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, updated_at'),
    ]);

    const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
      url: `${BASE_URL}/listing/${l.id}`,
      lastModified: new Date((l as Record<string, string>).updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const sellerRoutes: MetadataRoute.Sitemap = (sellers ?? []).map((s) => ({
      url: `${BASE_URL}/seller/${s.id}`,
      lastModified: new Date((s as Record<string, string>).updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...speciesRoutes, ...listingRoutes, ...sellerRoutes];
  } catch {
    return [...staticRoutes, ...speciesRoutes];
  }
}
