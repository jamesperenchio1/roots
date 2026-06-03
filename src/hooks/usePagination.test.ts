import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns first page of items', () => {
    const { result } = renderHook(() => usePagination(items, { pageSize: 10 }));
    expect(result.current.visibleItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.total).toBe(25);
    expect(result.current.page).toBe(1);
  });

  it('loads more items', () => {
    const { result } = renderHook(() => usePagination(items, { pageSize: 10 }));

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.visibleItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.current.page).toBe(2);
    expect(result.current.hasMore).toBe(true);
  });

  it('reaches end of list', () => {
    const { result } = renderHook(() => usePagination(items, { pageSize: 10 }));

    act(() => result.current.loadMore());
    act(() => result.current.loadMore());

    expect(result.current.visibleItems).toHaveLength(25);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.page).toBe(3);
  });

  it('resets to first page', () => {
    const { result } = renderHook(() => usePagination(items, { pageSize: 10 }));

    act(() => result.current.loadMore());
    act(() => result.current.reset());

    expect(result.current.visibleItems).toHaveLength(10);
    expect(result.current.page).toBe(1);
  });

  it('handles empty array', () => {
    const { result } = renderHook(() => usePagination([], { pageSize: 10 }));
    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it('handles items shorter than page size', () => {
    const short = [1, 2, 3];
    const { result } = renderHook(() => usePagination(short, { pageSize: 10 }));
    expect(result.current.visibleItems).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(false);
  });
});
