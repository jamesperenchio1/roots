import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnboarding } from './useOnboarding';
import * as useAuthModule from './useAuth';
import { supabase } from '@/lib/supabase/client';

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  } as Storage;
}

function mockUseAuth(overrides: Partial<ReturnType<typeof useAuthModule.useAuth>> = {}) {
  const defaultValue = {
    user: null,
    isAdmin: false,
    login: vi.fn(),
    signup: vi.fn(),
    signInWithOAuth: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    isLoading: false,
    isRestoring: false,
    freshSignup: false,
    acknowledgeFreshSignup: vi.fn(),
  };
  vi.mocked(useAuthModule.useAuth).mockReturnValue({ ...defaultValue, ...overrides } as ReturnType<typeof useAuthModule.useAuth>);
}

describe('useOnboarding', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      value: createLocalStorageMock(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens tutorial automatically when onboarding_status is empty', async () => {
    mockUseAuth({
      user: {
        id: 'u1',
        display_name: 'Test User',
        is_admin: false,
        strike_count: 0,
        is_banned: false,
        language_preference: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: {},
      } as ReturnType<typeof useAuthModule.useAuth>['user'],
    });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.showTutorial).toBe(true);
      expect(result.current.isOnboarding).toBe(true);
    });
  });

  it('does not open tutorial when onboarding is completed', async () => {
    mockUseAuth({
      user: {
        id: 'u1',
        display_name: 'Test User',
        is_admin: false,
        strike_count: 0,
        is_banned: false,
        language_preference: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: { completed: true },
      } as ReturnType<typeof useAuthModule.useAuth>['user'],
    });

    const { result } = renderHook(() => useOnboarding());

    expect(result.current.showTutorial).toBe(false);
    expect(result.current.isOnboarding).toBe(false);
  });

  it('opens tutorial on fresh signup and acknowledges the flag', async () => {
    const acknowledgeFreshSignup = vi.fn();
    mockUseAuth({
      freshSignup: true,
      acknowledgeFreshSignup,
      user: {
        id: 'u1',
        display_name: 'Test User',
        is_admin: false,
        strike_count: 0,
        is_banned: false,
        language_preference: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: {},
      } as ReturnType<typeof useAuthModule.useAuth>['user'],
    });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.showTutorial).toBe(true);
      expect(acknowledgeFreshSignup).toHaveBeenCalled();
    });
  });

  it('skipTour marks onboarding as skipped and closes the modal', async () => {
    const refreshProfile = vi.fn();
    mockUseAuth({
      user: {
        id: 'u1',
        display_name: 'Test User',
        is_admin: false,
        strike_count: 0,
        is_banned: false,
        language_preference: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: {},
      } as ReturnType<typeof useAuthModule.useAuth>['user'],
      refreshProfile,
    });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.showTutorial).toBe(true));

    act(() => {
      result.current.skipTour();
    });

    expect(result.current.showTutorial).toBe(false);
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('dontShowAgain completes onboarding and persists locally', async () => {
    const refreshProfile = vi.fn();
    mockUseAuth({
      user: {
        id: 'u1',
        display_name: 'Test User',
        is_admin: false,
        strike_count: 0,
        is_banned: false,
        language_preference: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: {},
      } as ReturnType<typeof useAuthModule.useAuth>['user'],
      refreshProfile,
    });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.showTutorial).toBe(true));

    act(() => {
      result.current.dontShowAgain();
    });

    expect(result.current.showTutorial).toBe(false);
    expect(localStorage.getItem('roots-onboarding-completed')).toBe('true');
  });

  it('completeStep records a completed step', async () => {
    const refreshProfile = vi.fn();
    mockUseAuth({
      user: {
        id: 'u1',
        display_name: 'Test User',
        is_admin: false,
        strike_count: 0,
        is_banned: false,
        language_preference: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: {},
      } as ReturnType<typeof useAuthModule.useAuth>['user'],
      refreshProfile,
    });

    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.completeStep('browse');
    });

    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });
});
