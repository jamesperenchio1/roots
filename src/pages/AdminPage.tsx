import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Users as UsersIcon, DollarSign, Leaf, CheckCircle, XCircle, Ban, Hammer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardStats, getTransactionsWithDetails, DISPUTES, USERS, SPECIES } from '@/data/mockData';
import { updateOrderStatus } from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLocalAdmin } = useAuth();
  const location = useLocation();
  const tabs = [
    { id: '', label: 'Overview', icon: Shield },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'species', label: 'Species', icon: Leaf },
  ];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {isLocalAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">
              Local dev admin session — disable ENABLE_LOCAL_ADMIN before deploying
            </p>
          </div>
        )}

        <h1 className="text-2xl font-light tracking-tight mb-6">Admin Dashboard</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              to={`/admin/${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${location.pathname === `/admin/${tab.id}` ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

function Overview() {
  const stats = getDashboardStats();
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'GMV Today', value: `${stats.gmv_today.toLocaleString()} THB`, color: 'text-emerald-400' },
          { label: 'GMV This Week', value: `${stats.gmv_week.toLocaleString()} THB`, color: 'text-white' },
          { label: 'GMV This Month', value: `${stats.gmv_month.toLocaleString()} THB`, color: 'text-white' },
          { label: 'Active Listings', value: stats.active_listings.toString(), color: 'text-blue-400' },
          { label: 'Dispute Rate', value: `${stats.dispute_rate}%`, color: 'text-red-400' },
          { label: 'Total Users', value: stats.user_count.toString(), color: 'text-purple-400' },
          { label: 'Pending Disputes', value: stats.pending_disputes.toString(), color: 'text-amber-400' },
          { label: 'Pending Payouts', value: stats.pending_payouts.toString(), color: 'text-cyan-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Disputes() {
  const [disputes, setDisputes] = useState(DISPUTES);

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
      toast.success(`Dispute resolved in favor of ${resolution === 'buyer' ? 'buyer' : resolution === 'seller' ? 'seller' : 'partial'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resolve dispute');
    }
  };

  return (
    <div className="space-y-3">
      {disputes.map(d => (
        <div key={d.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Dispute #{d.id.slice(-4)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'open' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{d.status}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-1">Reason: {d.reason} | Opened by: {d.opened_by}</p>
          <p className="text-sm text-zinc-400 mb-3">{d.description}</p>
          {d.evidence_urls.length > 0 && (
            <div className="flex gap-2 mb-3">
              {d.evidence_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800">
                  <img src={url} alt="" className="w-full h-full object-cover" />
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
                <CheckCircle className="w-3 h-3" /> Rule for Buyer
              </button>
              <button
                onClick={() => handleResolve(d.id, 'seller')}
                className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <XCircle className="w-3 h-3" /> Rule for Seller
              </button>
              <button
                onClick={() => handleResolve(d.id, 'partial')}
                className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <Hammer className="w-3 h-3" /> Partial Refund
              </button>
            </div>
          )}
          {d.status !== 'open' && d.resolved_at && (
            <p className="text-xs text-zinc-600">Resolved: {d.resolved_at.slice(0, 10)} — {d.resolution_amount_thb?.toLocaleString()} THB</p>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersPage() {
  const [users, setUsers] = useState(USERS);

  const handleStrike = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, strike_count: u.strike_count + 1 } : u));
    toast.success('Strike added');
  };

  const handleBan = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: true } : u));
    toast.success('User banned');
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
              <p className="text-xs text-zinc-500">{u.location} | {u.sales_count} sales | Rating: {u.rating}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {u.strike_count > 0 && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{u.strike_count} strikes</span>}
            {u.is_banned && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Banned</span>}
            {!u.is_banned && (
              <>
                <button
                  onClick={() => handleStrike(u.id)}
                  className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                >
                  Strike
                </button>
                <button
                  onClick={() => handleBan(u.id)}
                  className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Ban className="w-3 h-3 inline mr-1" /> Ban
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
          }`}>{tx.status}</span>
        </div>
      ))}
    </div>
  );
}

function SpeciesAdmin() {
  return (
    <div className="space-y-2">
      {SPECIES.slice(0, 10).map(s => (
        <div key={s.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium">{s.scientific_name}</p>
            <p className="text-xs text-zinc-500">{s.common_name_en} | {s.category}</p>
          </div>
          <button className="text-xs text-zinc-500 hover:text-white transition-colors">Edit</button>
        </div>
      ))}
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
      </Routes>
    </AdminLayout>
  );
}
