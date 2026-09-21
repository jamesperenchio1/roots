'use client'

import { WifiOff, Loader2 } from 'lucide-react';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function RealtimeBanner() {
  const { user } = useAuth();
  const status = useRealtimeStatus(!!user);
  const { t } = useTranslation('common');

  // Only signed-in users have anything that needs live syncing (messages,
  // orders). Showing "Connection lost" to anonymous visitors on every page
  // reads as a site-wide outage and is pure noise.
  if (!user) return null;
  if (status === 'connected') return null;

  return (
    <div className={`fixed top-16 inset-x-0 z-40 flex items-center justify-center gap-2 py-1.5 text-xs font-medium transition-all ${
      status === 'disconnected'
        ? 'bg-red-500/90 text-white'
        : 'bg-amber-500/90 text-black'
    }`}>
      {status === 'disconnected' ? (
        <><WifiOff className="w-3 h-3" />{t('realtime.disconnected', 'Connection lost — reconnecting…')}</>
      ) : (
        <><Loader2 className="w-3 h-3 animate-spin" />{t('realtime.connecting', 'Connecting…')}</>
      )}
    </div>
  );
}
