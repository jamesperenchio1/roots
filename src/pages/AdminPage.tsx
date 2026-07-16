import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Users as UsersIcon, DollarSign, Leaf, CheckCircle, XCircle, Ban, Hammer, MessageSquare, ScanSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { getMarketSpecies } from '@/data/mockData';
import { updateOrderStatus, adminUpdateUser } from '@/lib/api';
import { fetchPendingListings, adminReviewListing } from '@/lib/listing-review';
import { getMessageReports, resolveMessageReport, getMessageById } from '@/lib/messaging';
import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import type { Listing } from '@/types';
import { useDashboardStats } from '@/hooks/queries/useDashboardStats';
import { useDisputes } from '@/hooks/queries/useUserData';
import { useUserTransactions } from '@/hooks/queries/useUserData';
import { usePublicData } from '@/hooks/queries/usePublicData';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation(['common']);
  const location = useLocation();
  const tabs = [
    { id: '', labelKey: 'overview', icon: Shield },
    { id: 'review', labelKey: 'review', icon: ScanSearch },
    { id: 'disputes', labelKey: 'disputes', icon: AlertTriangle },
    { id: 'users', labelKey: 'users', icon: UsersIcon },
    { id: 'transactions', labelKey: 'transactions', icon: DollarSign },
    { id: 'species', labelKey: 'species', icon: Leaf },
    { id: 'messages', labelKey: 'messages', icon: MessageSquare },
  ];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-light tracking-tight mb-6">{t('common:admin.title')}</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map((tab) => (
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

function Disputes() {
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

function UsersPage() {
  const { t } = useTranslation(['common']);
  const { data: publicData } = usePublicData();
  const [users, setUsers] = useState(publicData?.users ?? []);

  useEffect(() => {
    if (publicData?.users) setUsers(publicData.users);
  }, [publicData?.users]);

  const handleStrike = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextCount = target.strike_count + 1;
    try {
      await adminUpdateUser(userId, { strike_count: nextCount });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, strike_count: nextCount } : u));
      toast.success(t('common:admin.users.strikeToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleBan = async (userId: string) => {
    try {
      await adminUpdateUser(userId, { is_banned: true });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: true } : u));
      toast.success(t('common:admin.users.banToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  return (
    <div className="space-y-2">
      {users.filter((u) => !u.is_admin).map((u) => (
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

function SpeciesAdmin() {
  const { t } = useTranslation(['common']);
  const species = getMarketSpecies();
  return (
    <div className="space-y-2">
      {species.slice(0, 10).map((s) => (
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

function ReviewAdmin() {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPendingListings();
      setListings(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:admin.review.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const current = listings[0];

  const handleDecision = async (decision: 'active' | 'rejected') => {
    if (!current || !user) return;
    const finalReason = reason.trim() || (decision === 'active' ? 'Approved' : 'Rejected');
    setProcessing(true);
    try {
      await adminReviewListing(current.id, decision, finalReason, notes.trim(), user.id);
      toast.success(decision === 'active' ? t('common:admin.review.approved') : t('common:admin.review.rejected'));
      setListings((prev) => prev.slice(1));
      setReason('');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:admin.review.reviewFailed'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className="text-zinc-500">{t('common:admin.review.loading')}</p>;

  if (!current) {
    return (
      <div className="text-center py-16 bg-zinc-900/20 rounded-xl">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <p className="text-zinc-300 font-medium">{t('common:admin.review.emptyTitle')}</p>
        <p className="text-sm text-zinc-500">{t('common:admin.review.emptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden mb-4">
        <div className="aspect-square bg-zinc-800 relative">
          <img
            src={current.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white">
            {t('common:admin.review.pendingCount', { count: listings.length })}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-lg font-medium">{current.species?.common_name_en || current.species?.scientific_name}</h3>
            <p className="text-xs text-zinc-500">{current.species?.scientific_name}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-400 font-semibold">{current.price_thb.toLocaleString()} {t('common:currency')}</span>
            <span className="text-zinc-500">{current.size_category} · {current.delivery_options?.join(' + ')}</span>
          </div>
          <p className="text-xs text-zinc-500">
            {t('common:admin.review.sellerLabel')}: {current.seller?.display_name || current.seller_id}
          </p>
          {current.pickup_province && (
            <p className="text-xs text-zinc-500">
              {t('common:admin.review.pickupLabel')}: {current.pickup_province}{current.pickup_location ? ` · ${current.pickup_location}` : ''}
            </p>
          )}

          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${current.qr_verified_at ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>
            {current.qr_verified_at ? <CheckCircle className="w-4 h-4" /> : <ScanSearch className="w-4 h-4" />}
            {current.qr_verified_at
              ? (current.qr_verification_photo_url ? t('common:admin.review.qrVerifiedWithPhoto') : t('common:admin.review.qrVerified'))
              : t('common:admin.review.qrNotVerified')}
          </div>

          {current.qr_verification_photo_url && (
            <a href={current.qr_verification_photo_url} target="_blank" rel="noreferrer" className="block">
              <img src={current.qr_verification_photo_url} alt={t('common:admin.review.qrVerificationAlt')} className="w-full h-32 object-cover rounded-lg border border-white/5" />
            </a>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">{t('common:admin.review.reasonLabel')}</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">{t('common:admin.review.selectReason')}</option>
            <option value="QR verified">{t('common:admin.review.reasons.qrVerified')}</option>
            <option value="Manual pass">{t('common:admin.review.reasons.manualPass')}</option>
            <option value="Photo unclear">{t('common:admin.review.reasons.photoUnclear')}</option>
            <option value="Wrong plant">{t('common:admin.review.reasons.wrongPlant')}</option>
            <option value="Manual fail">{t('common:admin.review.reasons.manualFail')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">{t('common:admin.review.notesLabel')}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={processing}
          onClick={() => handleDecision('rejected')}
          className="flex-1 py-4 rounded-xl bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {t('common:admin.review.fail')}
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => handleDecision('active')}
          className="flex-1 py-4 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {t('common:admin.review.pass')}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="review" element={<ReviewAdmin />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="species" element={<SpeciesAdmin />} />
        <Route path="messages" element={<MessagesAdmin />} />
      </Routes>
    </AdminLayout>
  );
}
