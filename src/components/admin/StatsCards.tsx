import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '@/hooks/queries/useDashboardStats';

export function StatsCards() {
  const { t } = useTranslation(['common']);
  const { data: stats } = useDashboardStats();
  const statItems = [
    { labelKey: 'gmvToday', value: `${(stats?.gmv_today ?? 0).toLocaleString()} ${t('common:currency')}`, color: 'text-emerald-400' },
    { labelKey: 'gmvWeek', value: `${(stats?.gmv_week ?? 0).toLocaleString()} ${t('common:currency')}`, color: 'text-white' },
    { labelKey: 'gmvMonth', value: `${(stats?.gmv_month ?? 0).toLocaleString()} ${t('common:currency')}`, color: 'text-white' },
    { labelKey: 'activeListings', value: (stats?.active_listings ?? 0).toString(), color: 'text-blue-400' },
    { labelKey: 'disputeRate', value: `${stats?.dispute_rate ?? 0}%`, color: 'text-red-400' },
    { labelKey: 'totalUsers', value: (stats?.user_count ?? 0).toString(), color: 'text-purple-400' },
    { labelKey: 'pendingDisputes', value: (stats?.pending_disputes ?? 0).toString(), color: 'text-amber-400' },
    { labelKey: 'pendingPayouts', value: (stats?.pending_payouts ?? 0).toString(), color: 'text-cyan-400' },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((stat, i) => (
          <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{t(`common:admin.stats.${stat.labelKey}`)}</p>
            <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
