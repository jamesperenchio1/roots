import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 12, initialPage = 1 } = options;
  const [page, setPage] = useState(initialPage);

  const visibleItems = useMemo(() => {
    return items.slice(0, page * pageSize);
  }, [items, page, pageSize]);

  const hasMore = items.length > visibleItems.length;

  const loadMore = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    visibleItems,
    hasMore,
    page,
    loadMore,
    reset,
    total: items.length,
  };
}
