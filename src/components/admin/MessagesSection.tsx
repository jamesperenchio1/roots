'use client'

import { Ban, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getMessageReports, resolveMessageReport, getMessageById } from '@/lib/messaging';
import { useAuth } from '@/hooks/useAuth';

export function MessagesSection() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [reports, setReports] = useState(getMessageReports().filter((r) => r.status === 'open'));

  const handleResolve = async (reportId: string, resolution: 'dismissed' | 'deleted') => {
    if (!user) return;
    try {
      await resolveMessageReport(reportId, user.id, resolution);
      setReports(getMessageReports().filter((r) => r.status === 'open'));
      toast.success(resolution === 'deleted' ? t('common:admin.messages.deleted') : t('common:admin.messages.dismissed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  return (
    <div className="space-y-3">
      {reports.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">{t('common:admin.messages.empty')}</div>
      )}
      {reports.map((r) => {
        const message = getMessageById(r.message_id);
        return (
          <div key={r.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-xs text-zinc-500 mb-1">
                  {t('common:admin.messages.reportedBy', { reporter: r.reporter?.display_name || r.reported_by })}
                </p>
                <p className="text-sm text-zinc-300">{message?.content || '[unavailable]'}</p>
              </div>
              <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full shrink-0">{t('common:admin.messages.reason', { reason: r.reason })}</span>
            </div>
            {r.details && <p className="text-xs text-zinc-500 mb-3">{r.details}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleResolve(r.id, 'dismissed')}
                className="flex items-center gap-1 text-xs bg-zinc-700/30 text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors"
              >
                <XCircle className="w-3 h-3" /> {t('common:admin.messages.actions.dismiss')}
              </button>
              <button
                onClick={() => handleResolve(r.id, 'deleted')}
                className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Ban className="w-3 h-3" /> {t('common:admin.messages.actions.delete')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
