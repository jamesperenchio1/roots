import { useTranslation } from 'react-i18next';
import type { UserPresence } from '@/types';

interface PresenceIndicatorProps {
  presence?: UserPresence;
  showText?: boolean;
}

function useFormatLastSeen(iso?: string): string {
  const { t } = useTranslation(['messages']);
  if (!iso) return t('messages:presence.offline');
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t('messages:relative.justNow');
  if (diffMins < 60) return t('messages:relative.minutesAgo', { count: diffMins });
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return t('messages:relative.hoursAgo', { count: diffHours });
  return d.toLocaleDateString();
}

export default function PresenceIndicator({ presence, showText = false }: PresenceIndicatorProps) {
  const { t } = useTranslation(['messages']);
  const isOnline = presence?.status === 'online';
  const lastSeen = useFormatLastSeen(presence?.last_seen_at);

  return (
    <span className="inline-flex items-center gap-1.5" title={isOnline ? t('messages:presence.online') : t('messages:presence.lastSeen', { time: lastSeen })}>
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full border border-zinc-900 ${
          isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
        }`}
      />
      {showText && (
        <span className="text-xs text-zinc-400">
          {isOnline ? t('messages:presence.online') : t('messages:presence.lastSeen', { time: lastSeen })}
        </span>
      )}
    </span>
  );
}
