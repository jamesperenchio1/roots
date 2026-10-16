import type { Category } from '@/types';

/** Listing categories shown in Browse, in display order. */
export const BROWSE_CATEGORIES: Category[] = ['aroid', 'hoya', 'cactus', 'succulent', 'fern', 'orchid', 'other'];

export function isCategory(value: string): value is Category {
  return (BROWSE_CATEGORIES as string[]).includes(value);
}
