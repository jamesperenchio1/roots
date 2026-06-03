import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Leaf, Heart, MessageSquare, AlertTriangle, Settings, Package, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getTransactionsWithDetails, WATCHLIST, MESSAGES, DISPUTES } from '@/data/mockData';

const TABS = [
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'plants', label: 'My Plants', icon: Leaf },
  { id: 'watchlist', label: 'Watchlist', icon: Heart },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { tab } = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab && TABS.some(t => t.id === tab) ? tab : 'purchases');

  useEffect(() => {
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  const transactions = getTransactionsWithDetails().filter(t => t.buyer_id === user?.id);

  const renderContent = () => {
    switch (activeTab) {
      case 'purchases':
        return (
          <div className="space-y-3">
            {transactions.length > 0 ? transactions.map(tx => (
              <Link to={`/order/${tx.id}`} key={tx.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Package className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Order #{tx.id.slice(-4)}</p>
                    <p className="text-xs text-zinc-500">{tx.sale_price_thb.toLocaleString()} THB from {tx.seller?.display_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    tx.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' :
                    tx.status === 'delivered' ? 'bg-purple-500/10 text-purple-400' :
                    tx.status === 'disputed' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>{tx.status}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </Link>
            )) : (
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-2">No purchases yet</p>
                <Link to="/browse" className="text-emerald-400 text-sm hover:underline">Browse plants</Link>
              </div>
            )}
          </div>
        );
      case 'plants':
        return (
          <div className="grid sm:grid-cols-2 gap-4">
            {getTransactionsWithDetails().filter(t => t.buyer_id === user?.id && t.status === 'completed').map(tx => (
              <div key={tx.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-sm font-medium mb-1">Plant #{tx.plant_id.slice(-4)}</p>
                <p className="text-xs text-zinc-500 mb-2">Purchased for {tx.sale_price_thb.toLocaleString()} THB</p>
                <div className="flex gap-2">
                  <Link to={`/p/${tx.plant_id}`} className="text-xs text-emerald-400 hover:underline">View Provenance</Link>
                  <Link to={`/seller-dashboard/listings/new`} className="text-xs text-emerald-400 hover:underline">Relist</Link>
                </div>
              </div>
            ))}
            {getTransactionsWithDetails().filter(t => t.buyer_id === user?.id && t.status === 'completed').length === 0 && (
              <div className="text-center py-12 col-span-2">
                <p className="text-zinc-500 mb-2">You don't own any plants yet</p>
                <Link to="/browse" className="text-emerald-400 text-sm hover:underline">Start collecting</Link>
              </div>
            )}
          </div>
        );
      case 'watchlist':
        return (
          <div className="space-y-3">
            {WATCHLIST.filter(w => w.user_id === 'u-1').map(w => (
              <div key={w.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <div>
                  <p className="text-sm font-medium">{w.watch_type === 'species' ? 'Species' : 'Listing'} watch</p>
                  <p className="text-xs text-zinc-500">Target: {w.target_id}</p>
                </div>
                <button className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
            ))}
          </div>
        );
      case 'messages':
        return (
          <div className="space-y-3">
            {Array.from(new Set(MESSAGES.map(m => m.thread_id))).map(threadId => {
              const threadMessages = MESSAGES.filter(m => m.thread_id === threadId);
              const lastMessage = threadMessages[threadMessages.length - 1];
              return (
                <div key={threadId} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">{lastMessage.sender?.display_name || 'Unknown'}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-xs">{lastMessage.content}</p>
                    {lastMessage.flagged_contact_info && <span className="text-xs text-amber-400">Contact info flagged</span>}
                  </div>
                  <span className="text-xs text-zinc-600">{new Date(lastMessage.created_at).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        );
      case 'disputes':
        return (
          <div className="space-y-3">
            {DISPUTES.filter(d => d.status === 'open').map(d => (
              <div key={d.id} className="bg-zinc-900/30 border border-red-500/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Dispute #{d.id.slice(-4)}</span>
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{d.status}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-1">Reason: {d.reason}</p>
                <p className="text-sm text-zinc-400">{d.description}</p>
              </div>
            ))}
            {DISPUTES.filter(d => d.status === 'open').length === 0 && (
              <p className="text-zinc-500 text-center py-8">No active disputes</p>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Display Name</label>
              <input type="text" defaultValue={user?.display_name} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">PromptPay ID</label>
              <input type="text" defaultValue={user?.promptpay_id || ''} placeholder="Phone or National ID" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Language</label>
              <select defaultValue={user?.language_preference} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="th">Thai</option>
                <option value="en">English</option>
              </select>
            </div>
            <button className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
              Save Changes
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-light tracking-tight mb-6">Dashboard</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
