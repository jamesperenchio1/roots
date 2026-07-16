import { CheckCircle, Hammer, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { updateOrderStatus } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useDisputes } from '@/hooks/queries/useUserData';

export function DisputesSection() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const { data: disputes = [], refetch } = useDisputes(user?.id);

  const handleResolve = async (disputeId: string, resolution: 'buyer' | 'seller' | 'partial') => {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    try {
      await updateOrderStatus(dispute.transaction_id, {
        status: resolution === 'buyer' ? 'refunded' : 'completed',
      });

      toast.success(t('common:admin.disputes.resolvedToast', { resolution: t(`common:admin.disputes.resolutions.${resolution}`) }));
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:admin.disputes.resolveError'));
    }
  };

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <div key={d.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('common:admin.disputes.id', { id: d.id.slice(-4) })}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'open' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{t(`common:admin.disputes.status.${d.status}`)}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-1">{t('common:admin.disputes.meta', { reason: d.reason, openedBy: d.opened_by })}</p>
          <p className="text-sm text-zinc-400 mb-3">{d.description}</p>
          {d.evidence_urls.length > 0 && (
            <div className="flex gap-2 mb-3">
              {d.evidence_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800">
                  <img src={url} alt={t('common:admin.disputes.evidenceAlt')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
          {d.status === 'open' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleResolve(d.id, 'buyer')}
                className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> {t('common:admin.disputes.ruleBuyer')}
              </button>
              <button
                onClick={() => handleResolve(d.id, 'seller')}
                className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <XCircle className="w-3 h-3" /> {t('common:admin.disputes.ruleSeller')}
              </button>
              <button
                onClick={() => handleResolve(d.id, 'partial')}
                className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <Hammer className="w-3 h-3" /> {t('common:admin.disputes.partialRefund')}
              </button>
            </div>
          )}
          {d.status !== 'open' && d.resolved_at && (
            <p className="text-xs text-zinc-600">{t('common:admin.disputes.resolvedAt', { date: d.resolved_at.slice(0, 10), amount: d.resolution_amount_thb?.toLocaleString(), currency: t('common:currency') })}</p>
          )}
        </div>
      ))}
    </div>
  );
}
