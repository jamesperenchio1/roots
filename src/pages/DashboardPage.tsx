import { useState, useEffect, useSyncExternalStore } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Leaf, Heart, MessageSquare, AlertTriangle, Settings, Package, ChevronRight, X, Trash2, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getTransactionsWithDetails, WATCHLIST, DISPUTES, getSpeciesById } from '@/data/mockData';
import { updateProfile, toggleWatch, getOffersForBuyer, withdrawOffer, getUserPriceAlerts, deletePriceAlert, getUserThreads, hydrateUserOffers, hydrateUserDisputes, hydrateUserMessages, subscribeOffers, getOffersVersion } from '@/lib/api';
import { toast } from 'sonner';
import { sanitizeText } from '@/lib/validation';
import OfferCard from '@/components/OfferCard';

const TABS = [
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'plants', label: 'My Plants', icon: Leaf },
  { id: 'watchlist', label: 'Watchlist', icon: Heart },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const { tab } = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab && TABS.some(t => t.id === tab) ? tab : 'purchases');
  const [saving, setSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    display_name: user?.display_name || '',
    promptpay_id: user?.promptpay_id || '',
    language_preference: user?.language_preference || 'en',
  });
  const [localWatchlist, setLocalWatchlist] = useState(WATCHLIST.filter(w => w.user_id === user?.id));
  const [offersRefreshKey, setOffersRefreshKey] = useState(0);
  const [priceAlerts, setPriceAlerts] = useState(() => getUserPriceAlerts(user?.id || ''));

  // Re-render when realtime offers change.
  useSyncExternalStore(subscribeOffers, getOffersVersion);

  useEffect(() => {
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Keep form in sync when user loads
  useEffect(() => {
    if (user) {
      setSettingsForm({
        display_name: user.display_name || '',
        promptpay_id: user.promptpay_id || '',
        language_preference: user.language_preference || 'en',
      });
      setLocalWatchlist(WATCHLIST.filter(w => w.user_id === user.id));
      setPriceAlerts(getUserPriceAlerts(user.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, offersRefreshKey]);

  // Re-fetch offers when the Purchases tab opens
  useEffect(() => {
    if (activeTab !== 'purchases' || !user) return;
    let cancelled = false;
    hydrateUserOffers().then(() => { if (!cancelled) setOffersRefreshKey(k => k + 1); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  // Re-fetch disputes when the Disputes tab opens
  useEffect(() => {
    if (activeTab !== 'disputes' || !user) return;
    let cancelled = false;
    hydrateUserDisputes().then(() => { if (!cancelled) setOffersRefreshKey(k => k + 1); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  // Re-fetch messages when the Messages tab opens
  useEffect(() => {
    if (activeTab !== 'messages' || !user) return;
    let cancelled = false;
    hydrateUserMessages(user.id).then(() => { if (!cancelled) setOffersRefreshKey(k => k + 1); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  const transactions = getTransactionsWithDetails().filter(t => t.buyer_id === user?.id);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: sanitizeText(settingsForm.display_name, 50),
        promptpay_id: settingsForm.promptpay_id ? sanitizeText(settingsForm.promptpay_id, 20) : null,
        language_preference: settingsForm.language_preference as 'th' | 'en',
        updated_at: new Date().toISOString(),
      });
      await refreshProfile();
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWatch = async (watchId: string, targetId: string, type: 'species' | 'listing') => {
    if (!user) return;
    setLocalWatchlist(prev => prev.filter(w => w.id !== watchId));
    try {
      await toggleWatch(user.id, type, targetId, false);
      toast.success('Removed from watchlist');
    } catch {
      toast.error('Could not remove from watchlist');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'purchases': {
        const myOffers = user ? getOffersForBuyer(user.id) : [];
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-1">My Offers ({myOffers.filter(o => o.status === 'pending').length} pending)</h2>
              <div className="space-y-3">
                {myOffers.length > 0 ? myOffers.map(o => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    mode="buyer"
                    onWithdraw={async () => {
                      try {
                        await withdrawOffer(o.id);
                        toast.success('Offer withdrawn');
                        setOffersRefreshKey(k => k + 1);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to withdraw');
                      }
                    }}
                  />
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">No offers made yet</p>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-medium mb-1">Purchases ({transactions.length})</h2>
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
            </div>
          </div>
        );
      }
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-1">My Price Alerts ({priceAlerts.length})</h2>
              <div className="space-y-3">
                {priceAlerts.length > 0 ? priceAlerts.map(pa => (
                  <div key={pa.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pa.species?.common_name_en || pa.species?.scientific_name || 'Unknown'}</p>
                        <p className="text-xs text-zinc-500">Alert when price goes {pa.direction} {pa.threshold_thb.toLocaleString()} THB</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await deletePriceAlert(pa.id);
                          setPriceAlerts(prev => prev.filter(p => p.id !== pa.id));
                          toast.success('Price alert deleted');
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to delete');
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">No price alerts set</p>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-medium mb-1">Watchlist ({localWatchlist.length})</h2>
              <div className="space-y-3">
                {localWatchlist.length > 0 ? localWatchlist.map(w => {
                  const species = w.watch_type === 'species' ? getSpeciesById(w.target_id) : null;
                  return (
                    <div key={w.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                      <div>
                        <p className="text-sm font-medium">{w.watch_type === 'species' ? 'Species' : 'Listing'} watch</p>
                        <p className="text-xs text-zinc-500">Target: {species?.common_name_en || w.target_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.watch_type === 'species' && (
                          <Link
                            to={`/species/${w.target_id}`}
                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Bell className="w-3 h-3" /> Set Price Alert
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveWatch(w.id, w.target_id, w.watch_type)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 mb-2">Your watchlist is empty</p>
                    <Link to="/browse" className="text-emerald-400 text-sm hover:underline">Browse plants to watch</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="space-y-3">
            {(() => {
              const threads = getUserThreads(user?.id || '');
              const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
              if (threads.length === 0) {
                return (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 mb-2">No messages yet</p>
                    <Link to="/browse" className="text-emerald-400 text-sm hover:underline">Find plants to message sellers</Link>
                  </div>
                );
              }
              return (
                <>
                  {threads.slice(0, 3).map(t => (
                    <Link to={`/messages/${t.threadId}`} key={t.threadId} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                          {t.listing?.photos?.[0] ? (
                            <img src={t.listing.photos[0].storage_path} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.otherUser?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-xs">{t.lastMessage?.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {t.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">{t.lastMessage ? new Date(t.lastMessage.created_at).toLocaleDateString() : ''}</span>
                      </div>
                    </Link>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    {totalUnread > 0 && (
                      <span className="text-xs text-emerald-400">{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</span>
                    )}
                    <Link to="/messages" className="text-sm text-emerald-400 hover:underline ml-auto">View All Messages</Link>
                  </div>
                </>
              );
            })()}
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
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-2">No active disputes</p>
                <p className="text-zinc-600 text-sm">That is a good thing.</p>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={settingsForm.display_name}
                onChange={e => setSettingsForm({ ...settingsForm, display_name: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">PromptPay ID</label>
              <input
                type="text"
                value={settingsForm.promptpay_id}
                onChange={e => setSettingsForm({ ...settingsForm, promptpay_id: e.target.value })}
                placeholder="Phone or National ID"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Language</label>
              <select
                value={settingsForm.language_preference}
                onChange={e => setSettingsForm({ ...settingsForm, language_preference: e.target.value as 'th' | 'en' })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="th">Thai</option>
                <option value="en">English</option>
              </select>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
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
              type="button"
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
