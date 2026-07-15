import { describe, test, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  supabase: {},
}));

// Import after mock is set up.
const { getImageUrl, getSrcSet, isSupabaseStorageUrl } = await import('./images');

const SUPABASE_IMG = 'https://test.supabase.co/storage/v1/object/public/listing-photos/img.jpg';

describe('isSupabaseStorageUrl', () => {
  test('returns true for supabase storage URLs', () => {
    expect(isSupabaseStorageUrl(SUPABASE_IMG)).toBe(true);
  });

  test('returns false for external URLs', () => {
    expect(isSupabaseStorageUrl('https://example.com/photo.jpg')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isSupabaseStorageUrl('')).toBe(false);
  });
});

describe('getImageUrl', () => {
  test('returns original URL for non-supabase images', () => {
    const url = 'https://example.com/plant.jpg';
    expect(getImageUrl(url)).toBe(url);
  });

  test('returns undefined for undefined input', () => {
    expect(getImageUrl(undefined)).toBeUndefined();
  });

  test('appends width transform for supabase URLs', () => {
    const result = getImageUrl(SUPABASE_IMG, { width: 400 });
    expect(result).toContain('width=400');
  });

  test('appends multiple transform params', () => {
    const result = getImageUrl(SUPABASE_IMG, { width: 800, quality: 80, format: 'webp' });
    expect(result).toContain('width=800');
    expect(result).toContain('quality=80');
    expect(result).toContain('format=webp');
  });

  test('returns unmodified supabase URL when no options given', () => {
    const result = getImageUrl(SUPABASE_IMG);
    expect(result).toBe(SUPABASE_IMG);
  });
});

describe('getSrcSet', () => {
  test('returns undefined for non-supabase URLs', () => {
    const result = getSrcSet('https://example.com/img.jpg', { widths: [100, 200] });
    expect(result).toBeUndefined();
  });

  test('returns undefined for undefined input', () => {
    expect(getSrcSet(undefined, { widths: [400] })).toBeUndefined();
  });

  test('returns srcset string for supabase URLs with multiple widths', () => {
    const result = getSrcSet(SUPABASE_IMG, { widths: [400, 800] });
    expect(result).toContain('400w');
    expect(result).toContain('800w');
    expect(result).toContain(', ');
  });

  test('includes additional transform options in each URL', () => {
    const result = getSrcSet(SUPABASE_IMG, { widths: [400], quality: 80 });
    expect(result).toContain('quality=80');
  });
});
