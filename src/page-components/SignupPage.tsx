'use client'

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProvinceCombobox } from '@/components/ProvinceCombobox';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail, isStrongPassword } from '@/lib/validation';
import { sanitizeRedirect } from '@/lib/navigation';
import { getProvinceOptions } from '@/lib/provinces';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';

export default function SignupPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const provinceOptions = useMemo(() => getProvinceOptions(i18n.language), [i18n.language]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [promptpayId, setPromptpayId] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeRedirect(searchParams?.get('redirect'));
  const loginRedirect = redirect === '/' ? '' : `?redirect=${encodeURIComponent(redirect)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || !trimmedName) {
      setError(t('common:errors.required'));
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError(t('common:errors.invalidEmail'));
      return;
    }
    if (password.length < 8) {
      setError(t('common:errors.minLength', { count: 8 }));
      return;
    }
    if (!isStrongPassword(password)) {
      setError(t('auth:signup.passwordRequirements'));
      return;
    }
    if (trimmedName.length < 2) {
      setError(t('common:errors.minLength', { count: 2 }));
      return;
    }
    if (trimmedName.length > 50) {
      setError(t('common:errors.maxLength', { count: 50 }));
      return;
    }
    const res = await signup({ email: trimmedEmail, password, displayName: trimmedName, promptpayId, location });
    if (res.ok) {
      if (res.message) {
        toast.success(res.message, { duration: 6000 });
      } else {
        toast.success(t('auth:signup.success'));
        router.push(redirect);
      }
    } else {
      setError(res.error || t('common:errors.generic'));
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold">ROOTS</span>
          </Link>
          <h1 className="text-2xl font-light tracking-tight mb-2">{t('auth:signup.title')}</h1>
          <p className="text-zinc-500 text-sm">{t('auth:signup.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth:signup.displayNamePlaceholder')}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth:signup.emailPlaceholder')}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth:signup.passwordHint')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-2"
                aria-label={showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.promptpayId')}</label>
              <input
                type="text"
                value={promptpayId}
                onChange={(e) => setPromptpayId(e.target.value)}
                placeholder={t('auth:signup.promptpayPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.location')}</label>
              <ProvinceCombobox
                value={location}
                onChange={setLocation}
                placeholder={t('auth:signup.locationPlaceholder')}
                options={provinceOptions}
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-11 rounded-lg">
            {isLoading ? t('common:actions.loading') : t('auth:signup.submit')}
          </Button>
        </form>

        <div className="mt-6">
          <SocialAuthButtons returnPath={redirect} />
        </div>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {t('auth:signup.hasAccount')}{' '}
          <Link href={`/login${loginRedirect}`} className="text-emerald-400 hover:underline">{t('auth:signup.login')}</Link>
        </div>
      </div>
    </div>
  );
}
