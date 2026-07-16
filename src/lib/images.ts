import { SUPABASE_URL } from './supabase/client';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
  format?: 'origin' | 'avif' | 'webp';
}

const STORAGE_OBJECT_PATH = '/storage/v1/object/public/';

export function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith(`${SUPABASE_URL}${STORAGE_OBJECT_PATH}`);
}

/**
 * Append Supabase Storage image-transform params to a public storage URL.
 * Non-Supabase URLs are returned unchanged.
 */
export function getImageUrl(url: string | undefined, options: ImageTransformOptions = {}): string | undefined {
  if (!url) return undefined;
  if (!isSupabaseStorageUrl(url)) return url;

  const u = new URL(url);
  if (options.width) u.searchParams.set('width', String(options.width));
  if (options.height) u.searchParams.set('height', String(options.height));
  if (options.resize) u.searchParams.set('resize', options.resize);
  if (options.quality) u.searchParams.set('quality', String(options.quality));
  if (options.format) u.searchParams.set('format', options.format);
  return u.toString();
}

interface SrcSetOptions extends ImageTransformOptions {
  widths: number[];
  sizes?: string;
}

/**
 * Build a srcset string for a Supabase Storage image at multiple widths.
 * Returns undefined for non-Supabase URLs.
 */
export function getSrcSet(url: string | undefined, options: SrcSetOptions): string | undefined {
  if (!url || !isSupabaseStorageUrl(url)) return undefined;
  return options.widths
    .map((w) => {
      const transformed = getImageUrl(url, { ...options, width: w });
      return `${transformed} ${w}w`;
    })
    .join(', ');
}

/**
 * Default responsive breakpoints used for listing photos.
 */
export const RESPONSIVE_WIDTHS = [320, 640, 960, 1280, 1920];

/**
 * Sizes attribute for listing card thumbnails.
 */
export const CARD_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw';

/**
 * Sizes attribute for a full-width hero/detail image.
 */
export const HERO_SIZES = '100vw';
