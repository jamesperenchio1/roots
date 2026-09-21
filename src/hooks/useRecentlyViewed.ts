import { useCallback, useEffect, useRef, useState } from 'react';
import { recordListingView } from '@/lib/api';

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const recordedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRecentlyViewed(JSON.parse(raw));
    } catch {
      // Ignore malformed or unavailable storage.
    }
  }, []);

  const recordView = useCallback((listingId: string) => {
    try {
      setRecentlyViewed((prev) => {
        const next = [listingId, ...prev.filter((id) => id !== listingId)].slice(0, MAX_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      // Ignore private mode / quota errors.
    }

    // Count the view once per session per listing.
    if (!recordedRef.current.has(listingId)) {
      recordedRef.current.add(listingId);
      void recordListingView(listingId);
    }
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentlyViewed([]);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  return { recentlyViewed, recordView, clearRecentlyViewed };
}
