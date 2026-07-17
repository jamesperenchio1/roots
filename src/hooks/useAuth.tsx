'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Profile } from '@/types';
import { supabase } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import i18n from '@/i18n/config';
import {
  mapProfile,
  ensureProfile,
  hydrateUserMessages,
  subscribeToNotifications,
  subscribeToOffers,
  subscribeToListings,
  subscribeToTransactions,
  subscribeToPriceSnapshots,
  subscribeToWatchlist,
} from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { publicKeys, userKeys } from '@/lib/queryKeys';
import { subscribeToConversations } from '@/lib/messaging';

interface SignupInput {
  email: string;
  password: string;
  displayName: string;
  promptpayId?: string;
  location?: string;
}

interface AuthContextType {
  user: Profile | null;
  isAdmin: boolean;
  login: (email: string, password: string, options?: { rememberMe?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  signup: (input: SignupInput) => Promise<{ ok: boolean; error?: string; message?: string }>;
  signInWithOAuth: (provider: Provider, redirectTo?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  isLoading: boolean;
  isRestoring: boolean;
  freshSignup: boolean;
  acknowledgeFreshSignup: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  login: async () => ({ ok: false }),
  signup: async () => ({ ok: false, error: 'Signup not available' }),
  signInWithOAuth: async () => ({ ok: false }),
  logout: () => {},
  refreshProfile: async () => {},
  resetPassword: async () => ({ ok: false }),
  updatePassword: async () => ({ ok: false }),
  isLoading: false,
  isRestoring: true,
  freshSignup: false,
  acknowledgeFreshSignup: () => {},
});

function isNetworkError(err: Error): boolean {
  return isNetworkErrorMessage(err.message);
}

function isNetworkErrorMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('abort');
}

function networkErrorMessage(): string {
  return i18n.t('common:errors.network');
}

function consumeOAuthReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem('oauth_return_path');
    if (path) {
      sessionStorage.removeItem('oauth_return_path');
      return path;
    }
  } catch {
    // sessionStorage may be unavailable in private/incognito or restricted contexts.
  }
  return null;
}

function applyOAuthReturnPath(path: string) {
  const target = path === '/' || path === '' ? '/' : path;
  window.location.replace(target);
}

async function fetchProfile(id: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
      logger.warn('fetchProfile failed', { error: error.message });
      return null;
    }
    return data ? mapProfile(data) : null;
  } catch (e) {
    logger.warn('fetchProfile threw', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [freshSignup, setFreshSignup] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startSubscriptions = useCallback((uid: string) => {
    unsubscribeRef.current?.();
    const unsubs: (() => void)[] = [
      subscribeToNotifications(uid),
      subscribeToOffers(uid),
      subscribeToListings(),
      subscribeToTransactions(uid),
      subscribeToPriceSnapshots(),
      subscribeToConversations(uid),
      subscribeToWatchlist(uid),
    ];
    unsubscribeRef.current = () => unsubs.forEach((u) => u());
  }, []);

  const stopSubscriptions = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        // Respect "Remember me" preference: if the user unchecked it, clear
        // the stored session instead of restoring it.
        try {
          if (localStorage.getItem('roots.rememberMe') === 'false') {
            await supabase.auth.signOut({ scope: 'local' });
            if (active) setIsRestoring(false);
            return;
          }
        } catch {
          // localStorage may be unavailable.
        }
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (uid && active) {
          let p = await fetchProfile(uid);
          if (!p && data.session?.user) {
            await ensureProfile(uid, data.session.user.user_metadata);
            p = await fetchProfile(uid);
          }
          if (active && p) {
            setUser(p);
            queryClient.invalidateQueries({ queryKey: publicKeys.all() });
            queryClient.invalidateQueries({ queryKey: userKeys.all(uid) });
            hydrateUserMessages(uid);
            startSubscriptions(uid);
          }
        }
      } catch (err) {
        logger.warn('session restore failed', { error: err instanceof Error ? err.message : String(err) });
      } finally {
        if (active) setIsRestoring(false);
      }
    };
    restore();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          let p = await fetchProfile(session.user.id);
          if (!p) {
            await ensureProfile(session.user.id, session.user.user_metadata);
            p = await fetchProfile(session.user.id);
          }
          if (p) {
            setUser(p);
            queryClient.invalidateQueries({ queryKey: publicKeys.all() });
            queryClient.invalidateQueries({ queryKey: userKeys.all(session.user.id) });
            startSubscriptions(session.user.id);
            const returnPath = consumeOAuthReturnPath();
            if (returnPath) applyOAuthReturnPath(returnPath);
          }
        } else {
          setUser(null);
          setFreshSignup(false);
          stopSubscriptions();
          queryClient.removeQueries({ queryKey: ['user'] });
        }
      } catch (err) {
        logger.warn('auth state change handler failed', { error: err instanceof Error ? err.message : String(err) });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      stopSubscriptions();
    };
  }, [startSubscriptions, stopSubscriptions]);

  const login = useCallback(async (email: string, password: string, options?: { rememberMe?: boolean }): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const rememberMe = options?.rememberMe ?? true;
      try {
        localStorage.setItem('roots.rememberMe', String(rememberMe));
      } catch {
        // localStorage may be unavailable in restricted contexts.
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { ok: false, error: isNetworkErrorMessage(error.message) ? networkErrorMessage() : error.message };
      }
      if (!data.user) {
        return { ok: false, error: i18n.t('auth:login.error') };
      }
      let p = await fetchProfile(data.user.id);
      if (!p) {
        await ensureProfile(data.user.id, data.user.user_metadata);
        p = await fetchProfile(data.user.id);
      }
      if (p) {
        setUser(p);
        queryClient.invalidateQueries({ queryKey: publicKeys.all() });
        queryClient.invalidateQueries({ queryKey: userKeys.all(p.id) });
        await hydrateUserMessages(p.id);
        startSubscriptions(p.id);
        return { ok: true };
      }
      return { ok: false, error: i18n.t('auth:login.error') };
    } catch (err) {
      logger.warn('login failed', { error: err instanceof Error ? err.message : String(err) });
      return {
        ok: false,
        error: err instanceof Error && isNetworkError(err)
          ? networkErrorMessage()
          : i18n.t('common:errors.generic'),
      };
    } finally {
      setIsLoading(false);
    }
  }, [startSubscriptions]);

  const signup = useCallback(async (input: SignupInput): Promise<{ ok: boolean; error?: string; message?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            display_name: input.displayName.trim(),
            promptpay_id: input.promptpayId?.trim() || null,
            location: input.location?.trim() || null,
          },
        },
      });
      if (error) {
        return { ok: false, error: isNetworkErrorMessage(error.message) ? networkErrorMessage() : error.message };
      }
      // If Supabase requires email confirmation, no session is returned yet.
      if (!data.session || !data.user) {
        return {
          ok: true,
          message: i18n.t('auth:signup.pendingConfirmation'),
        };
      }
      // Make sure the profiles row exists even if the Supabase trigger is missing or delayed.
      await ensureProfile(data.user.id, data.user.user_metadata);
      // Auto-confirm trigger lets us sign in right away.
      const { ok } = await login(input.email.trim(), input.password);
      if (ok) {
        setFreshSignup(true);
      }
      return ok
        ? { ok: true }
        : { ok: false, error: i18n.t('auth:signup.loginRequired') };
    } catch (err) {
      logger.warn('signup failed', { error: err instanceof Error ? err.message : String(err) });
      const message = err instanceof Error && isNetworkError(err)
        ? networkErrorMessage()
        : i18n.t('common:errors.generic');
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const signInWithOAuth = useCallback(async (provider: Provider, redirectTo?: string): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${window.location.origin}/`,
          queryParams: provider === 'apple'
            ? { response_mode: 'form_post' }
            : undefined,
        },
      });
      if (error) {
        return { ok: false, error: isNetworkErrorMessage(error.message) ? networkErrorMessage() : error.message };
      }
      return { ok: true };
    } catch (err) {
      logger.warn('signInWithOAuth failed', { error: err instanceof Error ? err.message : String(err) });
      return {
        ok: false,
        error: err instanceof Error && isNetworkError(err)
          ? networkErrorMessage()
          : i18n.t('common:errors.generic'),
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      logger.warn('resetPassword failed', { error: err instanceof Error ? err.message : String(err) });
      return { ok: false, error: networkErrorMessage() };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      logger.warn('updatePassword failed', { error: err instanceof Error ? err.message : String(err) });
      return { ok: false, error: i18n.t('common:errors.network') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('logout failed', { error: err instanceof Error ? err.message : String(err) });
    }
    setUser(null);
    setFreshSignup(false);
    stopSubscriptions();
  }, [stopSubscriptions]);

  const acknowledgeFreshSignup = useCallback(() => {
    setFreshSignup(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const p = await fetchProfile(user.id);
        if (p) setUser(p);
      } catch (err) {
        logger.warn('refreshProfile failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isAdmin: user?.is_admin || false,
    login,
    signup,
    signInWithOAuth,
    logout,
    refreshProfile,
    resetPassword,
    updatePassword,
    isLoading,
    isRestoring,
    freshSignup,
    acknowledgeFreshSignup,
  }), [user, login, signup, signInWithOAuth, logout, refreshProfile, resetPassword, updatePassword, isLoading, isRestoring, freshSignup, acknowledgeFreshSignup]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
