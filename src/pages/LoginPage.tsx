import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeRedirect } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = sanitizeRedirect(searchParams.get('redirect'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { ok, error: loginError } = await login(email, password);
    if (ok) {
      navigate(redirect);
    } else {
      setError(loginError || t('auth:login.error'));
    }
  };

  const signupRedirect = redirect === '/' ? '' : `?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold">ROOTS</span>
          </Link>
          <h1 className="text-2xl font-light tracking-tight mb-2">{t('auth:login.title')}</h1>
          <p className="text-zinc-500 text-sm">{t('auth:login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:login.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth:login.passwordPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
              <input type="checkbox" className="rounded bg-zinc-900 border-white/10" />
              {t('common:actions.rememberMe', { defaultValue: 'Remember me' })}
            </label>
            <Link to="/forgot-password" className="text-xs text-emerald-400 hover:underline">
              {t('auth:login.forgotPassword')}
            </Link>
          </div>
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-11 rounded-lg" disabled={isLoading}>
            {isLoading ? t('common:actions.loading') : t('auth:login.submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {t('auth:login.noAccount')}{' '}
          <Link to={`/signup${signupRedirect}`} className="text-emerald-400 hover:underline">{t('auth:login.signup')}</Link>
        </div>
      </div>
    </div>
  );
}
