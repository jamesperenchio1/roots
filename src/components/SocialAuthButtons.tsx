'use client'

import { useTranslation } from 'react-i18next';
import type { Provider } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface SocialAuthButtonsProps {
  /** Full URL used as Supabase redirectTo (must not contain a hash fragment). */
  redirect?: string;
  /** In-app path to return the user to after OAuth succeeds (e.g. `/browse`). */
  returnPath?: string;
}

export function SocialAuthButtons({ redirect, returnPath }: SocialAuthButtonsProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { signInWithOAuth, isLoading } = useAuth();

  async function handleProvider(provider: Provider) {
    // Google does not accept hash-router URLs as redirect URIs. Use the
    // clean origin; Supabase appends the session tokens and the app's
    // onAuthStateChange listener picks them up.
    const cleanRedirect = redirect ? redirect.split('#')[0] : `${window.location.origin}/`;
    if (returnPath) {
      sessionStorage.setItem('oauth_return_path', returnPath);
    } else {
      sessionStorage.removeItem('oauth_return_path');
    }
    const res = await signInWithOAuth(provider, cleanRedirect);
    if (!res.ok && res.error) {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-zinc-500">{t('auth:social.orContinueWith')}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={() => handleProvider('google')}
        className="w-full h-11 rounded-lg border-white/10 bg-zinc-900 hover:bg-white/5 text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span className="ml-2 text-sm">{t('auth:social.continueWithGoogle')}</span>
      </Button>
    </div>
  );
}
