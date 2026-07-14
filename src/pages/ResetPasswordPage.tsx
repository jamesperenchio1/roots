import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Leaf, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { updatePassword, isLoading } = useAuth();
  const navigate = useNavigate();

  // Supabase puts the access_token in the URL fragment after redirect.
  // Strip it from history once detected so it does not linger in the URL.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('common:errors.minLength', { count: 8 }));
      return;
    }
    if (password !== confirm) {
      setError(t('common:errors.passwordMismatch'));
      return;
    }
    const res = await updatePassword(password);
    if (res.ok) {
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(res.error || t('common:errors.generic'));
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold">ROOTS</span>
          </Link>
          <h1 className="text-2xl font-light tracking-tight mb-2">{t('auth:resetPassword.title')}</h1>
          <p className="text-zinc-500 text-sm">{t('auth:resetPassword.subtitle')}</p>
        </div>

        {done ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-medium mb-1">{t('auth:resetPassword.success')}</h2>
            <p className="text-sm text-zinc-500">
              {t('common:errors.redirecting')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:resetPassword.newPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth:resetPassword.newPasswordPlaceholder')}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:resetPassword.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('auth:resetPassword.confirmPasswordPlaceholder')}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-11 rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? t('common:actions.loading') : t('auth:resetPassword.submit')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
