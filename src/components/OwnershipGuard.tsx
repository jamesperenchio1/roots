import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function OwnershipGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const { user, isRestoring } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [checking, setChecking] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!id || !user) {
        if (mounted) setChecking(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('seller_id')
          .eq('id', id)
          .single();
        if (error || !data) {
          if (mounted) setIsOwner(false);
        } else {
          if (mounted) setIsOwner(data.seller_id === user.id || user.is_admin);
        }
      } catch {
        if (mounted) setIsOwner(false);
      } finally {
        if (mounted) setChecking(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [id, user]);

  if (isRestoring || checking) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">{t('authGuard.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/listing/${id}/edit`)}`} replace />;
  }

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
