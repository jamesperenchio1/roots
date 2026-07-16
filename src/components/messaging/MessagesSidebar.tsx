import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ConversationWithDetails } from '@/lib/messaging';
import type { UserPresence } from '@/types';
import ConversationList from './ConversationList';

interface MessagesSidebarProps {
  hasActiveConversation: boolean;
  conversations: ConversationWithDetails[];
  activeId?: string;
  loading: boolean;
  dateFormatter: (dateStr: string) => string;
  presenceMap: Record<string, UserPresence | undefined>;
  onSelect: (id: string) => void;
}

export default function MessagesSidebar({
  hasActiveConversation,
  conversations,
  activeId,
  loading,
  dateFormatter,
  presenceMap,
  onSelect,
}: MessagesSidebarProps) {
  const { t } = useTranslation(['messages', 'common']);

  return (
    <div
      className={`${hasActiveConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-white/10 bg-zinc-900/20 flex-col md:min-h-[70vh]`}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('messages:title')}</h2>
        <Link
          to="/dashboard"
          className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('common:nav.dashboard')}
        </Link>
      </div>
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        loading={loading}
        emptyTitle={t('messages:loading')}
        emptyDescription={t('messages:noThreads')}
        emptyCta={t('common:empty.cta')}
        dateFormatter={dateFormatter}
        presenceMap={presenceMap}
        onSelect={onSelect}
      />
    </div>
  );
}
