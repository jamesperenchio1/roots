import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentlyViewed } from './useRecentlyViewed';

const LS_KEY = 'recently_viewed';

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('getRecentlyViewed returns empty array when nothing stored', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.getRecentlyViewed()).toEqual([]);
  });

  test('recordView adds listing id to storage', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.recordView('listing-1'));
    expect(result.current.getRecentlyViewed()).toContain('listing-1');
  });

  test('recordView prepends most recent to front', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => {
      result.current.recordView('listing-1');
      result.current.recordView('listing-2');
    });
    const items = result.current.getRecentlyViewed();
    expect(items[0]).toBe('listing-2');
    expect(items[1]).toBe('listing-1');
  });

  test('recordView deduplicates — moves existing to front', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => {
      result.current.recordView('listing-1');
      result.current.recordView('listing-2');
      result.current.recordView('listing-1');
    });
    const items = result.current.getRecentlyViewed();
    expect(items[0]).toBe('listing-1');
    expect(items.filter((id) => id === 'listing-1').length).toBe(1);
  });

  test('caps at 12 items', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => { for (let i = 0; i < 15; i++) result.current.recordView(`listing-${i}`); });
    expect(result.current.getRecentlyViewed().length).toBeLessThanOrEqual(12);
  });

  test('clearRecentlyViewed empties the list', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.recordView('listing-1'));
    act(() => result.current.clearRecentlyViewed());
    expect(result.current.getRecentlyViewed()).toEqual([]);
  });

  test('handles malformed localStorage data gracefully', () => {
    localStorage.setItem(LS_KEY, 'not-json');
    const { result } = renderHook(() => useRecentlyViewed());
    expect(() => result.current.getRecentlyViewed()).not.toThrow();
    expect(result.current.getRecentlyViewed()).toEqual([]);
  });
});
