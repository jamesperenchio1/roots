import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmptyConversation() {
  const { t } = useTranslation(['messages']);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
      <MessageSquare className="w-12 h-12 text-zinc-700 mb-4" />
      <p className="text-zinc-500 mb-2">{t('messages:emptyState.title')}</p>
      <p className="text-zinc-600 text-sm">{t('messages:emptyState.description')}</p>
    </div>
  );
}
