import { useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '@/lib/api';
import NotificationPanel from './NotificationPanel';

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const unread = getUnreadCount(userId);

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <NotificationPanel userId={userId} open={open} onClose={close} />
    </div>
  );
}
