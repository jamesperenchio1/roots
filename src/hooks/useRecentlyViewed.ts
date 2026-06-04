const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 12;

export function useRecentlyViewed() {
  const getRecentlyViewed = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const recordView = (listingId: string) => {
    try {
      const current = getRecentlyViewed();
      const next = [listingId, ...current.filter(id => id !== listingId)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const clearRecentlyViewed = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  return { getRecentlyViewed, recordView, clearRecentlyViewed };
}
