import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Users as UsersIcon, DollarSign, Leaf, CheckCircle, XCircle, Ban, Hammer, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardStats, getTransactionsWithDetails, DISPUTES, USERS, getMarketSpecies } from '@/data/mockData';
import { updateOrderStatus, hydrateUserDisputes, hydratePublicData, adminUpdateUser } from '@/lib/api';
import { getMessageReports, resolveMessageReport, getMessageById } from '@/lib/messaging';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation(['common']);
  const { isLocalAdmin } = useAuth();
  const location = useLocation();
  const tabs = [
    { id: '', labelKey: 'overview', icon: Shield },
    { id: 'disputes', labelKey: 'disputes', icon: AlertTriangle },
    { id: 'users', labelKey: 'users', icon: UsersIcon },
    { id: 'transactions', labelKey: 'transactions', icon: DollarSign },
    { id: 'species', labelKey: 'species', icon: Leaf },
    { id: 'messages', labelKey: 'messages', icon: MessageSquare },
  ];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {isLocalAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">
              {t('common:admin.localAdminWarning')}
            </p>
          </div>
        )}

        <h1 className="text-2xl font-light tracking-tight mb-6">{t('common:admin.title')}</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              to={`/admin/${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${location.pathname === `/admin/${tab.id}` ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className="w-4 h-4" />
              {t(`common:admin.tabs.${tab.labelKey}`)}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

function Overview() {
  const { t } = useTranslation(['common']);
  const stats = getDashboardStats();
  const statItems = [
    { labelKey: 'gmvToday', value: `${stats.gmv_today.toLocaleString()} THB`, color: 'text-emerald-400' },
    { labelKey: 'gmvWeek', value: `${stats.gmv_week.toLocaleString()} THB`, color: 'text-white' },
    { labelKey: 'gmvMonth', value: `${stats.gmv_month.toLocaleString()} THB`, color: 'text-white' },
    { labelKey: 'activeListings', value: stats.active_listings.toString(), color: 'text-blue-400' },
    { labelKey: 'disputeRate', value: `${stats.dispute_rate}%`, color: 'text-red-400' },
    { labelKey: 'totalUsers', value: stats.user_count.toString(), color: 'text-purple-400' },
    { labelKey: 'pendingDisputes', value: stats.pending_disputes.toString(), color: 'text-amber-400' },
    { labelKey: 'pendingPayouts', value: stats.pending_payouts.toString(), color: 'text-cyan-400' },
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

function Disputes() {
  const { t } = useTranslation(['common']);
  const [disputes, setDisputes] = useState(DISPUTES);

  useEffect(() => {
    let cancelled = false;
    hydrateUserDisputes().then(() => { if (!cancelled) setDisputes([...DISPUTES]); });
    return () => { cancelled = true; };
  }, []);

  const handleResolve = async (disputeId: string, resolution: 'buyer' | 'seller' | 'partial') => {
    const dispute = disputes.find(d => d.id === disputeId);
    if (!dispute) return;

    try {
      await updateOrderStatus(dispute.transaction_id, {
        status: resolution === 'buyer' ? 'refunded' : 'completed',
      });

      setDisputes(prev => prev.map(d =>
        d.id === disputeId
          ? {
              ...d,
              status: resolution === 'partial' ? 'resolved_partial' : resolution === 'buyer' ? 'resolved_buyer' : 'resolved_seller',
              resolved_at: new Date().toISOString(),
              resolution_amount_thb: resolution === 'buyer' ? d.transaction?.sale_price_thb : resolution === 'partial' ? Math.round((d.transaction?.sale_price_thb || 0) / 2) : 0,
            }
          : d
      ));
      toast.success(t('common:admin.disputes.resolvedToast', { resolution: t(`common:admin.disputes.resolutions.${resolution}`) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:admin.disputes.resolveError'));
    }
  };

  return (
    <div className="space-y-3">
      {disputes.map(d => (
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
            <p className="text-xs text-zinc-600">{t('common:admin.disputes.resolvedAt', { date: d.resolved_at.slice(0, 10), amount: d.resolution_amount_thb?.toLocaleString() })}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersPage() {
  const { t } = useTranslation(['common']);
  const { isLocalAdmin } = useAuth();
  const [users, setUsers] = useState(USERS);

  useEffect(() => {
    let cancelled = false;
    hydratePublicData().then(() => {
      if (!cancelled) setUsers([...USERS]);
    });
    return () => { cancelled = true; };
  }, []);

  const handleStrike = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const nextCount = target.strike_count + 1;
    try {
      if (!isLocalAdmin) {
        await adminUpdateUser(userId, { strike_count: nextCount });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, strike_count: nextCount } : u));
      toast.success(t('common:admin.users.strikeToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleBan = async (userId: string) => {
    try {
      if (!isLocalAdmin) {
        await adminUpdateUser(userId, { is_banned: true });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: true } : u));
      toast.success(t('common:admin.users.banToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  return (
    <div className="space-y-2">
      {users.filter(u => !u.is_admin).map(u => (
        <div key={u.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
              {u.display_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{u.display_name}</p>
              <p className="text-xs text-zinc-500">{t('common:admin.users.meta', { location: u.location, sales: u.sales_count, rating: u.rating })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {u.strike_count > 0 && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{t('common:admin.users.strikes', { count: u.strike_count })}</span>}
            {u.is_banned && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{t('common:admin.users.banned')}</span>}
            {!u.is_banned && (
              <>
                <button
                  onClick={() => handleStrike(u.id)}
                  className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                >
                  {t('common:admin.users.strike')}
                </button>
                <button
                  onClick={() => handleBan(u.id)}
                  className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Ban className="w-3 h-3 inline mr-1" /> {t('common:admin.users.ban')}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Transactions() {
  const { t } = useTranslation(['common']);
  const txs = getTransactionsWithDetails();
  return (
    <div className="space-y-2">
      {txs.map(tx => (
        <div key={tx.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium">{tx.sale_price_thb.toLocaleString()} THB</p>
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

function SpeciesAdmin() {
  const { t } = useTranslation(['common']);
  const species = getMarketSpecies();
  return (
    <div className="space-y-2">
      {species.slice(0, 10).map(s => (
        <div key={s.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium">{s.scientific_name}</p>
            <p className="text-xs text-zinc-500">{s.common_name_en} | {s.category}</p>
          </div>
          <button className="text-xs text-zinc-500 hover:text-white transition-colors">{t('common:actions.edit')}</button>
        </div>
      ))}
    </div>
  );
}

function MessagesAdmin() {
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

export default function AdminPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="species" element={<SpeciesAdmin />} />
        <Route path="messages" element={<MessagesAdmin />} />
      </Routes>
    </AdminLayout>
  );
}
