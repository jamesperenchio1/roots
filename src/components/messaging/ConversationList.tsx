import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ConversationWithDetails } from '@/lib/messaging';
import type { UserPresence } from '@/types';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  activeId?: string;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyCta: string;
  dateFormatter: (dateStr: string) => string;
  presenceMap: Record<string, UserPresence | undefined>;
  onSelect: (id: string) => void;
}

export default function ConversationList({
  conversations,
  activeId,
  loading,
  emptyTitle,
  emptyDescription,
  emptyCta,
  dateFormatter,
  presenceMap,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {loading && conversations.length === 0 && (
        <div className="text-center py-12 px-4">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3 animate-pulse" />
          <p className="text-zinc-500 text-sm">{emptyTitle}</p>
        </div>
      )}
      {!loading && conversations.length === 0 ? (
        <div className="text-center py-12 px-4">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm mb-2">{emptyDescription}</p>
          <Link to="/browse" className="text-emerald-400 text-sm hover:underline">
            {emptyCta}
          </Link>
        </div>
      ) : (
        conversations.map((c) => (
          <ConversationItem
            key={c.conversation.id}
            conversation={c}
            isActive={activeId === c.conversation.id}
            dateFormatter={dateFormatter}
            presence={presenceMap[c.otherUser?.id || '']}
            onClick={() => onSelect(c.conversation.id)}
          />
        ))
      )}
    </div>
  );
}
