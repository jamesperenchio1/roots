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

const PROVIDERS: { id: Provider; labelKey: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    labelKey: 'auth:social.continueWithGoogle',
    icon: (
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
    ),
  },
  {
    id: 'apple',
    labelKey: 'auth:social.continueWithApple',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.16-.91 3.52-.78 1.34.13 2.28.74 2.96 1.64-2.63 1.54-2.29 5.98.22 7.13-.57 1.5-1.31 2.99-2.78 4.24zM12.03 7.25c-.15-2.11 1.86-3.92 3.94-3.84.29 2.32-2.14 4.48-3.94 3.84z" />
      </svg>
    ),
  },
];

export function SocialAuthButtons({ redirect, returnPath }: SocialAuthButtonsProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { signInWithOAuth, isLoading } = useAuth();

  async function handleProvider(provider: Provider) {
    // Google/Apple do not accept hash-router URLs as redirect URIs. Use the
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
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => handleProvider(provider.id)}
            className="h-11 rounded-lg border-white/10 bg-zinc-900 hover:bg-white/5 text-white"
          >
            {provider.icon}
            <span className="ml-2 text-sm">{t(provider.labelKey)}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
