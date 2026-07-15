import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftMessage } from './useDraftMessage';

vi.useFakeTimers();

describe('useDraftMessage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllTimers();
  });

  test('load returns empty string when no draft saved', () => {
    const { result } = renderHook(() => useDraftMessage('conv-1'));
    expect(result.current.load()).toBe('');
  });

  test('save persists draft after debounce delay', async () => {
    const { result } = renderHook(() => useDraftMessage('conv-1'));
    act(() => result.current.save('hello world'));
    // Before debounce fires, value is not yet saved
    expect(localStorage.getItem('roots:draft:conv-1')).toBeNull();
    // Advance timers past debounce
    act(() => vi.advanceTimersByTime(600));
    expect(localStorage.getItem('roots:draft:conv-1')).toBe('hello world');
  });

  test('load returns saved draft', () => {
    localStorage.setItem('roots:draft:conv-42', 'my draft');
    const { result } = renderHook(() => useDraftMessage('conv-42'));
    expect(result.current.load()).toBe('my draft');
  });

  test('clear removes draft from storage', () => {
    localStorage.setItem('roots:draft:conv-1', 'existing draft');
    const { result } = renderHook(() => useDraftMessage('conv-1'));
    act(() => result.current.clear());
    expect(localStorage.getItem('roots:draft:conv-1')).toBeNull();
  });

  test('save with empty string removes the draft after debounce', () => {
    localStorage.setItem('roots:draft:conv-1', 'some text');
    const { result } = renderHook(() => useDraftMessage('conv-1'));
    act(() => result.current.save(''));
    act(() => vi.advanceTimersByTime(600));
    expect(localStorage.getItem('roots:draft:conv-1')).toBeNull();
  });

  test('returns empty string when conversationId is undefined', () => {
    const { result } = renderHook(() => useDraftMessage(undefined));
    expect(result.current.load()).toBe('');
  });

  test('save is a no-op when conversationId is undefined', () => {
    const { result } = renderHook(() => useDraftMessage(undefined));
    act(() => result.current.save('text'));
    act(() => vi.advanceTimersByTime(600));
    // No keys should have been written
    expect(localStorage.length).toBe(0);
  });
});
