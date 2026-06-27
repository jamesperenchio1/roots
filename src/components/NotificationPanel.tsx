import { useRef, useEffect, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  Trash2,
  Package,
  Truck,
  AlertTriangle,
  MessageSquare,
  Tag,
  Star,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Notification, NotificationType } from '@/types';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeNotifications,
  getNotificationsVersion,
} from '@/lib/api';
import { toast } from 'sonner';

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  order: Package,
  shipment: Truck,
  dispute: AlertTriangle,
  message: MessageSquare,
  offer: Tag,
  review: Star,
  system: Info,
};



interface NotificationPanelProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ userId, open, onClose }: NotificationPanelProps) {
  const { t } = useTranslation(['common']);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return t('common:notifications.time.justNow');
    if (minutes < 60) return t('common:notifications.time.minutesAgo', { count: minutes });
    if (hours < 24) return t('common:notifications.time.hoursAgo', { count: hours });
    if (days < 7) return t('common:notifications.time.daysAgo', { count: days });
    return new Date(dateStr).toLocaleDateString();
  };
  useSyncExternalStore(subscribeNotifications, getNotificationsVersion);
  const items = getNotifications(userId);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleMouseDown);
      return () => document.removeEventListener('mousedown', handleMouseDown);
    }
  }, [open, onClose]);

  const handleMarkRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markNotificationRead(id);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead(userId);
    toast.success(t('common:notifications.markAllToast'));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.link) navigate(n.link);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">{t('common:nav.notifications')}</h3>
        {items.some(n => !n.read) && (
          <button
            onClick={handleMarkAll}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            {t('common:notifications.markAll')}
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {t('common:notifications.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((n) => {
              const Icon = ICON_MAP[n.type];
              return (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`group relative px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 ${
                    n.read ? 'opacity-70' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <Icon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${n.read ? 'text-zinc-300' : 'text-white font-medium'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>

                  <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                    {!n.read && (
                      <button
                        onClick={(e) => handleMarkRead(e, n.id)}
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title={t('common:notifications.markRead')}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                      title={t('common:actions.delete')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
