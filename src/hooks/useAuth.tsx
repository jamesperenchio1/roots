import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import i18n from '@/i18n/config';
import {
  mapProfile,
  ensureProfile,
  hydrateUserTransactions,
  hydrateUserNotifications,
  hydrateUserOffers,
  hydrateUserPriceAlerts,
  hydrateUserDisputes,
  hydrateUserMessages,
  subscribeToNotifications,
  subscribeToOffers,
  subscribeToListings,
  subscribeToTransactions,
  subscribeToPriceSnapshots,
} from '@/lib/api';
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
  isLocalAdmin: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (input: SignupInput) => Promise<{ ok: boolean; error?: string; message?: string }>;
  loginAsLocalAdmin: () => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  isLoading: boolean;
  isRestoring: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLocalAdmin: false,
  login: async () => ({ ok: false }),
  signup: async () => ({ ok: false, error: 'Signup not available' }),
  loginAsLocalAdmin: () => {},
  logout: () => {},
  refreshProfile: async () => {},
  resetPassword: async () => ({ ok: false }),
  updatePassword: async () => ({ ok: false }),
  isLoading: false,
  isRestoring: true,
});

function isNetworkError(err: Error): boolean {
  return isNetworkErrorMessage(err.message);
}

function isNetworkErrorMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('abort');
}

function networkErrorMessage(): string {
  return i18n.t('common:errors.network', { defaultValue: 'Network error. Please check your connection.' });
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
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Restore an existing session on load and react to auth changes.
  const isLocalAdminRef = useRef(isLocalAdmin);
  useEffect(() => {
    isLocalAdminRef.current = isLocalAdmin;
  }, [isLocalAdmin]);

  const startSubscriptions = useCallback((uid: string) => {
    unsubscribeRef.current?.();
    const unsubs: (() => void)[] = [
      subscribeToNotifications(uid),
      subscribeToOffers(uid),
      subscribeToListings(),
      subscribeToTransactions(uid),
      subscribeToPriceSnapshots(),
      subscribeToConversations(uid),
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
            hydrateUserTransactions();
            hydrateUserNotifications(uid);
            hydrateUserOffers();
            hydrateUserPriceAlerts();
            hydrateUserDisputes();
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
            startSubscriptions(session.user.id);
          }
        } else if (!isLocalAdminRef.current) {
          setUser(null);
          stopSubscriptions();
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

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { ok: false, error: isNetworkErrorMessage(error.message) ? networkErrorMessage() : error.message };
      }
      if (!data.user) {
        return { ok: false, error: i18n.t('auth:login.error', { defaultValue: 'Invalid email or password' }) };
      }
      let p = await fetchProfile(data.user.id);
      if (!p) {
        await ensureProfile(data.user.id, data.user.user_metadata);
        p = await fetchProfile(data.user.id);
      }
      if (p) {
        setUser(p);
        setIsLocalAdmin(false);
        await hydrateUserTransactions();
        await hydrateUserNotifications(p.id);
        await hydrateUserOffers();
        await hydrateUserPriceAlerts();
        await hydrateUserDisputes();
        await hydrateUserMessages(p.id);
        startSubscriptions(p.id);
        return { ok: true };
      }
      return { ok: false, error: i18n.t('auth:login.error', { defaultValue: 'Invalid email or password' }) };
    } catch (err) {
      logger.warn('login failed', { error: err instanceof Error ? err.message : String(err) });
      return {
        ok: false,
        error: err instanceof Error && isNetworkError(err)
          ? networkErrorMessage()
          : i18n.t('common:errors.generic', { defaultValue: 'Something went wrong. Please try again.' }),
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
          message: i18n.t('auth:signup.pendingConfirmation', { defaultValue: 'Account created. Please check your email to confirm, then log in.' }),
        };
      }
      // Make sure the profiles row exists even if the Supabase trigger is missing or delayed.
      await ensureProfile(data.user.id, data.user.user_metadata);
      // Auto-confirm trigger lets us sign in right away.
      const { ok } = await login(input.email.trim(), input.password);
      return ok
        ? { ok: true }
        : { ok: false, error: i18n.t('auth:signup.loginRequired', { defaultValue: 'Account created — please log in.' }) };
    } catch (err) {
      logger.warn('signup failed', { error: err instanceof Error ? err.message : String(err) });
      const message = err instanceof Error && isNetworkError(err)
        ? networkErrorMessage()
        : i18n.t('common:errors.generic', { defaultValue: 'Something went wrong. Please try again.' });
      return { ok: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const resetPassword = useCallback(async (email: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
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
      return { ok: false, error: i18n.t('common:errors.network', { defaultValue: 'Network error. Please check your connection.' }) };
    }
  }, []);

  const loginAsLocalAdmin = useCallback(() => {
    if (!import.meta.env.DEV) {
      logger.warn('loginAsLocalAdmin blocked in production');
      return;
    }
    const adminUser: Profile = {
      id: 'local-admin',
      display_name: 'Local Dev Admin',
      is_admin: true,
      strike_count: 0,
      is_banned: false,
      language_preference: 'en',
      created_at: '2023-01-01',
      updated_at: '2024-01-01',
      location: 'Bangkok',
    };
    setUser(adminUser);
    setIsLocalAdmin(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('logout failed', { error: err instanceof Error ? err.message : String(err) });
    }
    setUser(null);
    setIsLocalAdmin(false);
    stopSubscriptions();
  }, [stopSubscriptions]);

  const refreshProfile = useCallback(async () => {
    if (user && !isLocalAdmin) {
      try {
        const p = await fetchProfile(user.id);
        if (p) setUser(p);
      } catch (err) {
        logger.warn('refreshProfile failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }, [user, isLocalAdmin]);

  const value = useMemo(() => ({
    user,
    isAdmin: user?.is_admin || false,
    isLocalAdmin,
    login,
    signup,
    loginAsLocalAdmin,
    logout,
    refreshProfile,
    resetPassword,
    updatePassword,
    isLoading,
    isRestoring,
  }), [user, isLocalAdmin, login, signup, loginAsLocalAdmin, logout, refreshProfile, resetPassword, updatePassword, isLoading, isRestoring]);

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
