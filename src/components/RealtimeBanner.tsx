'use client'

import { WifiOff, Loader2 } from 'lucide-react';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { useTranslation } from 'react-i18next';

export default function RealtimeBanner() {
  const status = useRealtimeStatus();
  const { t } = useTranslation('common');

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
