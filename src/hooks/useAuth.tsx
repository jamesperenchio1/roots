import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { mapProfile, hydrateUserTransactions } from '@/lib/api';

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
  login: (email: string, password: string) => Promise<boolean>;
  signup: (input: SignupInput) => Promise<{ ok: boolean; error?: string }>;
  loginAsLocalAdmin: () => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLocalAdmin: false,
  login: async () => false,
  signup: async () => ({ ok: false }),
  loginAsLocalAdmin: () => {},
  logout: () => {},
  refreshProfile: async () => {},
  isLoading: false,
});

async function fetchProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  return data ? mapProfile(data) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Restore an existing session on load and react to auth changes.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id;
      if (uid && active) {
        const p = await fetchProfile(uid);
        if (active && p) {
          setUser(p);
          hydrateUserTransactions();
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (p) setUser(p);
      } else if (!isLocalAdmin) {
        setUser(null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setIsLoading(false);
      return false;
    }
    const p = await fetchProfile(data.user.id);
    if (p) {
      setUser(p);
      setIsLocalAdmin(false);
      await hydrateUserTransactions();
    }
    setIsLoading(false);
    return !!p;
  }, []);

  const signup = useCallback(async (input: SignupInput): Promise<{ ok: boolean; error?: string }> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          promptpay_id: input.promptpayId || null,
          location: input.location || null,
        },
      },
    });
    if (error) {
      setIsLoading(false);
      return { ok: false, error: error.message };
    }
    // Auto-confirm trigger lets us sign in right away.
    const ok = await login(input.email, input.password);
    setIsLoading(false);
    return ok ? { ok: true } : { ok: false, error: 'Account created — please log in.' };
  }, [login]);

  const loginAsLocalAdmin = useCallback(() => {
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

  const logout = useCallback(() => {
    supabase.auth.signOut();
    setUser(null);
    setIsLocalAdmin(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && !isLocalAdmin) {
      const p = await fetchProfile(user.id);
      if (p) setUser(p);
    }
  }, [user, isLocalAdmin]);

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin: user?.is_admin || false,
      isLocalAdmin,
      login,
      signup,
      loginAsLocalAdmin,
      logout,
      refreshProfile,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
