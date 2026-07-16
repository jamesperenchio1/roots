'use client'

import { Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminUpdateUser } from '@/lib/api';
import { useProfiles } from '@/hooks/queries/useProfiles';
import type { Profile } from '@/types';

export function UsersSection() {
  const { t } = useTranslation(['common']);
  const { data: profiles } = useProfiles();
  const [users, setUsers] = useState<Profile[]>(profiles ?? []);

  useEffect(() => {
    if (profiles) setUsers(profiles);
  }, [profiles]);

  const handleStrike = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextCount = target.strike_count + 1;
    try {
      await adminUpdateUser(userId, { strike_count: nextCount });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, strike_count: nextCount } : u));
      toast.success(t('common:admin.users.strikeToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleBan = async (userId: string) => {
    try {
      await adminUpdateUser(userId, { is_banned: true });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: true } : u));
      toast.success(t('common:admin.users.banToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  return (
    <div className="space-y-2">
      {users.filter((u) => !u.is_admin).map((u) => (
        <div key={u.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
              {u.display_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{u.display_name}</p>
              <p className="text-xs text-zinc-500">{t('common:admin.users.meta', { location: u.location, sales: u.sales_count, rating: u.rating })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {u.strike_count > 0 && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{t('common:admin.users.strikes', { count: u.strike_count })}</span>}
            {u.is_banned && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{t('common:admin.users.banned')}</span>}
            {!u.is_banned && (
              <>
                <button
                  onClick={() => handleStrike(u.id)}
                  className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                >
                  {t('common:admin.users.strike')}
                </button>
                <button
                  onClick={() => handleBan(u.id)}
                  className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Ban className="w-3 h-3 inline mr-1" /> {t('common:admin.users.ban')}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
