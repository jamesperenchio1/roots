import type { UserPresence } from '@/types';

interface PresenceIndicatorProps {
  presence?: UserPresence;
  showText?: boolean;
}

function formatLastSeen(iso?: string): string {
  if (!iso) return 'Offline';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString();
}

export default function PresenceIndicator({ presence, showText = false }: PresenceIndicatorProps) {
  const isOnline = presence?.status === 'online';

  return (
    <span className="inline-flex items-center gap-1.5" title={isOnline ? 'Online' : `Last seen ${formatLastSeen(presence?.last_seen_at)}`}>
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full border border-zinc-900 ${
          isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
        }`}
      />
      {showText && (
        <span className="text-xs text-zinc-400">
          {isOnline ? 'Online' : `Last seen ${formatLastSeen(presence?.last_seen_at)}`}
        </span>
      )}
    </span>
  );
}
