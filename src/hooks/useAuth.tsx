import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Profile } from '@/types';
import { USERS } from '@/data/mockData';

interface AuthContextType {
  user: Profile | null;
  isAdmin: boolean;
  isLocalAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsLocalAdmin: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLocalAdmin: false,
  login: async () => false,
  loginAsLocalAdmin: () => {},
  logout: () => {},
  isLoading: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 500));
    
    if (email === 'admin@local' && password === 'admin') {
      loginAsLocalAdmin();
      setIsLoading(false);
      return true;
    }
    
    const foundUser = USERS.find(u => {
      const mockEmail = `${u.display_name.toLowerCase().replace(/[^a-z]/g, '')}@root.market`;
      return mockEmail === email && password === 'password';
    });
    
    if (foundUser) {
      setUser(foundUser);
      setIsLocalAdmin(false);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

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
    setUser(null);
    setIsLocalAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin: user?.is_admin || false,
      isLocalAdmin,
      login,
      loginAsLocalAdmin,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
