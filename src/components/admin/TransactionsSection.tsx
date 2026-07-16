import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useUserTransactions } from '@/hooks/queries/useUserData';

export function TransactionsSection() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const { data: txs = [] } = useUserTransactions(user?.id);
  return (
    <div className="space-y-2">
      {txs.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium">{tx.sale_price_thb.toLocaleString()} {t('common:currency')}</p>
            <p className="text-xs text-zinc-500">{tx.buyer?.display_name} &rarr; {tx.seller?.display_name}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
            tx.status === 'disputed' ? 'bg-red-500/10 text-red-400' :
            'bg-amber-500/10 text-amber-400'
          }`}>{t(`common:status.${tx.status}`)}</span>
        </div>
      ))}
    </div>
  );
}
