'use client'

import { memo } from 'react';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConversationWithDetails } from '@/lib/messaging';
import type { UserPresence } from '@/types';
import PresenceIndicator from './PresenceIndicator';

interface ConversationItemProps {
  conversation: ConversationWithDetails;
  isActive: boolean;
  dateFormatter: (dateStr: string) => string;
  presence?: UserPresence;
  onClick?: () => void;
}

function ConversationItemInner({ conversation, isActive, dateFormatter, presence, onClick }: ConversationItemProps) {
  const { t } = useTranslation(['messages', 'common']);
  const { otherUser, lastMessage, unreadCount, listing } = conversation;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {listing?.photos?.[0] ? (
          <img src={listing.photos[0].storage_path} alt="" className="w-full h-full object-cover" />
        ) : otherUser?.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <MessageSquare className="w-5 h-5 text-zinc-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate flex items-center gap-1.5">
            {otherUser?.display_name || t('common:unknownUser')}
            <PresenceIndicator presence={presence} />
          </p>
          {lastMessage && (
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {dateFormatter(lastMessage.created_at)}
            </span>
          )}
        </div>
        <p className={`text-xs truncate ${unreadCount > 0 ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
          {lastMessage?.content || t('messages:noMessages')}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="bg-emerald-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
          {unreadCount}
        </span>
      )}
    </button>
  );
}

const ConversationItem = memo(ConversationItemInner);
export default ConversationItem;
