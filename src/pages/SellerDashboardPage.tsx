import { useState, useEffect, useCallback } from 'react';

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Package, DollarSign, TrendingUp, Plus, Eye, Heart,
  BarChart3, Truck, Wallet, ArrowDownLeft,
  Clock, CheckCircle, Users, Star,
  Megaphone, Settings, Tag
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getActiveListings, getTransactionsWithDetails, PLANT_IMAGES, USERS,
  getSpeciesPriceStats
} from '@/data/mockData';
import { updateProfile, hydrateUserTransactions, withdrawListing, getOffersForSeller, respondToOffer, notifyOfferResponse } from '@/lib/api';
import MarkShippedModal from '@/components/MarkShippedModal';
import OfferCard from '@/components/OfferCard';
import { toast } from 'sonner';
import { Sparkline } from '@/components/PriceChart';
import { ALL_SPECIES } from '@/data/speciesDatabase';

const TABS_DEF = [
  { id: 'listings', label: 'Listings', icon: Package },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'offers', label: 'Offers', icon: Tag },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const { tab } = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab && TABS_DEF.some(t => t.id === tab) ? tab : 'listings');
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [shipModalOrder, setShipModalOrder] = useState<string | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState<string | null>(null);
  const [qrChecklist, setQrChecklist] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('qr_checklist') || '{}'); } catch { return {}; }
  });
  const currentUserId = user?.id || '';

  const toggleQrCheck = (listingId: string) => {
    setQrChecklist(prev => {
      const next = { ...prev, [listingId]: !prev[listingId] };
      localStorage.setItem('qr_checklist', JSON.stringify(next));
      return next;
    });
  };

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (tab && TABS_DEF.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Re-fetch transactions when Sales tab opens and set up realtime
  useEffect(() => {
    if (activeTab !== 'sales' || !user) return;
    let cancelled = false;
    hydrateUserTransactions().then(() => {
      if (!cancelled) refresh();
    });
    const channel = supabase
      .channel(`seller-transactions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `seller_id=eq.${user.id}` },
        () => {
          hydrateUserTransactions().then(() => {
            if (!cancelled) {
              refresh();
              toast.info('New order received');
            }
          });
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeTab, user, refresh]);

  const me = USERS.find(u => u.id === currentUserId);
  const listings = getActiveListings().filter(l => l.seller_id === currentUserId);
  const allSales = getTransactionsWithDetails().filter(t => t.seller_id === currentUserId);
  const completedSales = allSales.filter(s => s.status === 'completed');
  const pendingSales = allSales.filter(s => s.status === 'paid_in_escrow' || s.status === 'shipped' || s.status === 'disputed');
  const totalRevenue = completedSales.reduce((s, t) => s + t.seller_payout_thb, 0);
  const pendingRevenue = pendingSales.reduce((s, t) => s + t.seller_payout_thb, 0);

  // Real payout history derived from completed sales. Each completed order is a
  // payout you can still drill into and track the plant afterwards.
  const payouts = completedSales.map(t => ({
    id: t.id,
    date: (t.completed_at || t.created_at).slice(0, 10),
    status: 'completed' as const,
    totalAmount: t.seller_payout_thb,
    method: 'PromptPay',
    destination: me?.promptpay_id || 'Not set',
    processedAt: t.completed_at ? t.completed_at.replace('T', ' ').slice(0, 19) : null,
    transactions: [{
      orderId: t.id,
      plant: t.listing?.species?.common_name_en || t.listing?.species?.scientific_name || 'Plant',
      buyer: t.buyer?.display_name || 'Buyer',
      price: t.sale_price_thb,
      fee: t.platform_fee_thb,
      net: t.seller_payout_thb,
    }],
  }));

  const renderContent = () => {
    switch (activeTab) {
      case 'listings':
        return (
          <div>
            {withdrawConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
                  <h3 className="text-lg font-medium mb-2">Withdraw Listing?</h3>
                  <p className="text-sm text-zinc-400 mb-6">This will remove your listing from the marketplace. You can relist it later from your dashboard.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setWithdrawConfirm(null)} className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5">Cancel</button>
                    <button
                      onClick={async () => {
                        try {
                          await withdrawListing(withdrawConfirm);
                          toast.success('Listing withdrawn.');
                          setWithdrawConfirm(null);
                          refresh();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to withdraw.');
                        }
                      }}
                      className="flex-1 py-2.5 rounded-lg text-sm bg-red-500 text-white font-medium hover:bg-red-600"
                    >Withdraw</button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium">Active Listings ({listings.length})</h2>
                <p className="text-xs text-zinc-500">Manage your current plant listings</p>
              </div>
              <Link to="/seller-dashboard/listings/new" className="flex items-center gap-1.5 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
                <Plus className="w-4 h-4" /> New Listing
              </Link>
            </div>
            <div className="space-y-3">
              {listings.map(l => {
                const speciesData = ALL_SPECIES.find(s => l.plant_id?.includes(s.id));
                const price30d = getSpeciesPriceStats(l.plant_id?.replace('p-', 'sp-') || '', 30);
                const vsMarket = price30d ? ((l.price_thb - price30d.median) / price30d.median * 100).toFixed(0) : '0';
                return (
                  <div key={l.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        <img src={l.photos?.[0]?.storage_path || PLANT_IMAGES[l.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'} alt={l.species?.scientific_name || 'Plant listing'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium truncate">{l.species?.common_name_en || speciesData?.common_name_en || 'Unknown Plant'}</p>
                          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 shrink-0">{l.status}</span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate mb-1">{l.species?.scientific_name || speciesData?.scientific_name}</p>
                        <div className="flex items-center gap-3 text-xs text-zinc-600">
                          <span className="text-emerald-400 font-semibold">{l.price_thb.toLocaleString()} THB</span>
                          <span>{l.size_category} size</span>
                          <span>{l.delivery_options?.join(' + ')}</span>
                          <span className={parseFloat(vsMarket) > 20 ? 'text-amber-400' : parseFloat(vsMarket) < -20 ? 'text-emerald-400' : 'text-zinc-500'}>
                            {parseFloat(vsMarket) > 0 ? '+' : ''}{vsMarket}% vs market
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-3 text-xs text-zinc-600 mb-2">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.view_count || 0}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {l.watch_count || 0}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/listing/${l.id}`} className="text-xs text-emerald-400 hover:underline">View</Link>
                          <Link to={`/listing/${l.id}/edit`} className="text-xs text-zinc-500 hover:text-white">Edit</Link>
                          <Link to={`/p/${l.id}`} className="text-xs text-zinc-500 hover:text-white">QR</Link>
                          <button
                            onClick={() => setWithdrawConfirm(l.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >Withdraw</button>
                        </div>
                        <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-500 cursor-pointer hover:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={qrChecklist[l.id] || false}
                            onChange={() => toggleQrCheck(l.id)}
                            className="w-3 h-3 accent-emerald-500"
                          />
                          QR tag attached to plant
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
              {listings.length === 0 && (
                <div className="text-center py-12 bg-zinc-900/20 rounded-xl">
                  <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 mb-1">No active listings</p>
                  <p className="text-zinc-600 text-sm mb-4">Start selling your first plant</p>
                  <Link to="/seller-dashboard/listings/new" className="text-emerald-400 text-sm hover:underline">Create listing</Link>
                </div>
              )}
            </div>
          </div>
        );

      case 'sales':
        return (
          <div className="space-y-6">
            {/* Pending Sales */}
            <div>
              <h2 className="text-lg font-medium mb-1">Pending Sales ({pendingSales.length})</h2>
              <p className="text-xs text-zinc-500 mb-3">Orders awaiting shipping or delivery</p>
              <div className="space-y-2">
                {pendingSales.length > 0 ? pendingSales.map(s => (
                  <div key={`${s.id}-${refreshKey}`} className="bg-zinc-900/30 border border-amber-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Order #{s.id.slice(-4)} — {s.plant_id}</p>
                          <p className="text-xs text-zinc-500">
                            Buyer: {s.buyer?.display_name} | Plant: {(s.sale_price_thb - (s.shipping_cost_thb || 0)).toLocaleString()} THB
                            {s.shipping_cost_thb ? ` + ${s.shipping_cost_thb.toLocaleString()} THB shipping` : ' · Free shipping'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">{s.status}</span>
                        {s.status === 'paid_in_escrow' && (
                          <>
                            <button
                              onClick={() => setShipModalOrder(s.id)}
                              className="block mt-2 text-xs text-emerald-400 hover:underline"
                            >Mark as Shipped</button>
                            <Link
                              to={`/order/${s.id}`}
                              className="block mt-1 text-xs text-zinc-500 hover:text-white"
                            >View Order</Link>
                          </>
                        )}
                        {s.status === 'shipped' && (
                          <>
                            <p className="text-xs text-zinc-600 mt-1">Tracking: {s.tracking_number || 'N/A'}</p>
                            <Link to={`/order/${s.id}`} className="block mt-1 text-xs text-zinc-500 hover:text-white">View Order</Link>
                          </>
                        )}
                        {s.status === 'disputed' && (
                          <>
                            <span className="inline-block mt-1 text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Dispute Opened</span>
                            <Link to={`/order/${s.id}`} className="block mt-1 text-xs text-red-400 hover:text-red-300">View Dispute</Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">No pending sales</p>
                )}
              </div>
            </div>

            {/* Shipping Guide Promo */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-400">New to shipping plants?</p>
                  <p className="text-xs text-zinc-500">Learn how to pack safely step-by-step</p>
                </div>
                <Link to="/shipping-guide" className="text-xs bg-emerald-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors">
                  Open Guide
                </Link>
              </div>
            </div>

            {/* Completed Sales */}
            <div>
              <h2 className="text-lg font-medium mb-1">Completed Sales ({completedSales.length})</h2>
              <p className="text-xs text-zinc-500 mb-3">Full transaction history</p>
              <div className="space-y-2">
                {completedSales.map(s => (
                  <div key={s.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Order #{s.id.slice(-4)}</p>
                          <p className="text-xs text-zinc-500">
                            Buyer: {s.buyer?.display_name} | Plant: {s.plant_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>{s.sale_price_thb.toLocaleString()} THB</p>
                        <p className="text-xs text-zinc-500">
                          Plant: {(s.sale_price_thb - (s.shipping_cost_thb || 0)).toLocaleString()} THB
                          {s.shipping_cost_thb ? ` · Ship: ${s.shipping_cost_thb.toLocaleString()}` : ' · Free ship'}
                        </p>
                        <p className="text-xs text-emerald-400">Payout: {s.seller_payout_thb.toLocaleString()} THB</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-600">
                      <span>Sale: {s.sale_price_thb.toLocaleString()} | Fee (8%): {s.platform_fee_thb.toLocaleString()} | You get: {s.seller_payout_thb.toLocaleString()}</span>
                      <span>{s.completed_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
                {completedSales.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center">No completed sales yet</p>}
              </div>
            </div>
            {shipModalOrder && (
              <MarkShippedModal
                orderId={shipModalOrder}
                onClose={() => setShipModalOrder(null)}
                onShipped={refresh}
              />
            )}
          </div>
        );

      case 'offers': {
        const offers = getOffersForSeller(currentUserId);
        const pendingOffers = offers.filter(o => o.status === 'pending');
        const otherOffers = offers.filter(o => o.status !== 'pending');
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-1">Incoming Offers ({pendingOffers.length} pending)</h2>
              <p className="text-xs text-zinc-500 mb-3">Respond to buyer offers on your listings</p>
              <div className="space-y-3">
                {pendingOffers.length > 0 ? pendingOffers.map(o => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    mode="seller"
                    onRespond={async (status, counterPrice) => {
                      try {
                        await respondToOffer(o.id, status, counterPrice);
                        if (status === 'accepted' || status === 'rejected' || status === 'countered') {
                          // TODO: notify buyer via notification API
                          await notifyOfferResponse(o.buyer_id || '', o.id, status);
                        }
                        toast.success(`Offer ${status}`);
                        refresh();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to respond');
                      }
                    }}
                  />
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">No pending offers</p>
                )}
              </div>
            </div>
            {otherOffers.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-1">Past Offers</h2>
                <div className="space-y-3">
                  {otherOffers.map(o => (
                    <OfferCard key={o.id} offer={o} mode="seller" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'payouts':
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Available Balance</p>
                <p className="text-xl font-semibold text-emerald-400">{pendingRevenue.toLocaleString()} THB</p>
                <p className="text-xs text-zinc-600 mt-1">From {pendingSales.length} pending orders</p>
              </div>
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Total Paid Out</p>
                <p className="text-xl font-semibold">{totalRevenue.toLocaleString()} THB</p>
                <p className="text-xs text-zinc-600 mt-1">{completedSales.length} transactions</p>
              </div>
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Total Fees Paid</p>
                <p className="text-xl font-semibold text-amber-400">{completedSales.reduce((s, t) => s + t.platform_fee_thb, 0).toLocaleString()} THB</p>
                <p className="text-xs text-zinc-600 mt-1">8% per sale</p>
              </div>
              <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Payout Method</p>
                <p className="text-xl font-semibold">PromptPay</p>
                <p className="text-xs text-zinc-600 mt-1">{me?.promptpay_id || 'Not set'}</p>
              </div>
            </div>

            {/* Payout History with Full Detail */}
            <div>
              <h2 className="text-lg font-medium mb-1">Payout History</h2>
              <p className="text-xs text-zinc-500 mb-3">Every payout with complete transaction breakdown</p>
              <div className="space-y-3">
                {payouts.length === 0 && (
                  <p className="text-zinc-600 text-sm py-4 text-center">No payouts yet — they appear here once a sale completes.</p>
                )}
                {payouts.map(payout => (
                  <div key={payout.id} className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
                    {/* Payout Header */}
                    <button
                      onClick={() => setExpandedPayout(expandedPayout === payout.id ? null : payout.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${payout.status === 'completed' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                          {payout.status === 'completed' ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-amber-400" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">Payout #{payout.id.slice(-4)}</p>
                          <p className="text-xs text-zinc-500">{payout.date} · {payout.transactions.length} transaction{payout.transactions.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{payout.totalAmount.toLocaleString()} THB</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {payout.status}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {expandedPayout === payout.id && (
                      <div className="border-t border-white/5 px-4 pb-4">
                        {/* Transaction Table */}
                        <div className="mt-3">
                          <div className="grid grid-cols-12 gap-2 text-xs text-zinc-600 mb-2 px-2">
                            <span className="col-span-4">Transaction</span>
                            <span className="col-span-2 text-right">Sale Price</span>
                            <span className="col-span-2 text-right">Fee (8%)</span>
                            <span className="col-span-2 text-right">Your Net</span>
                            <span className="col-span-2 text-right">Status</span>
                          </div>
                          {payout.transactions.map((tx, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 text-sm py-2 px-2 border-t border-white/5">
                              <div className="col-span-4">
                                <p className="font-medium truncate">{tx.plant}</p>
                                <p className="text-xs text-zinc-500">To: {tx.buyer}</p>
                                <Link to={`/order/${tx.orderId}`} className="text-xs text-emerald-400 hover:text-emerald-300">Track plant →</Link>
                              </div>
                              <span className="col-span-2 text-right">{tx.price.toLocaleString()}</span>
                              <span className="col-span-2 text-right text-amber-400">-{tx.fee.toLocaleString()}</span>
                              <span className="col-span-2 text-right text-emerald-400 font-medium">{tx.net.toLocaleString()}</span>
                              <span className="col-span-2 text-right">
                                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">Paid</span>
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Payout Summary */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-sm">
                          <div className="text-xs text-zinc-500">
                            <p>Paid to: {payout.destination} via {payout.method}</p>
                            {payout.processedAt && <p>Processed: {payout.processedAt}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Total payout</p>
                            <p className="text-lg font-semibold text-emerald-400">{payout.totalAmount.toLocaleString()} THB</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Fee Breakdown Card */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-3">Lifetime Fee Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total sales value</span>
                  <span>{completedSales.reduce((s, t) => s + t.sale_price_thb, 0).toLocaleString()} THB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Platform fees (8%)</span>
                  <span className="text-amber-400">-{completedSales.reduce((s, t) => s + t.platform_fee_thb, 0).toLocaleString()} THB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Dispute resolutions (refunds given)</span>
                  <span className="text-red-400">-0 THB</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5 font-medium">
                  <span>Net received</span>
                  <span className="text-emerald-400">{totalRevenue.toLocaleString()} THB</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return <AnalyticsTab listings={listings} allSales={allSales} />;

      case 'performance':
        return <PerformanceTab allSales={allSales} />;

      case 'settings':
        return <SellerSettings me={me} />;

      default:
        return null;
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Seller Header */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl font-medium overflow-hidden">
              {me?.avatar_url ? (
                <img src={me.avatar_url} alt={`${me?.display_name || 'Seller'} avatar`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                me?.display_name?.charAt(0) || 'S'
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-light">{me?.display_name || 'Seller Dashboard'}</h1>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {me?.rating || '4.9'}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {me?.sales_count || 0} sales</span>
                <span className="flex items-center gap-1"><MapPinIcon /> {me?.location || 'Bangkok'}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Available</p>
              <p className="text-lg font-semibold text-emerald-400">{pendingRevenue.toLocaleString()} THB</p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {TABS_DEF.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

function SellerSettings({ me }: { me?: typeof USERS[0] }) {
  const [promptpayId, setPromptpayId] = useState(me?.promptpay_id ?? '');
  const [location, setLocation] = useState(me?.location ?? '');
  const [saving, setSaving] = useState(false);
  const { user, refreshProfile } = useAuth();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        promptpay_id: promptpayId || undefined,
        location: location || undefined,
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

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">Payout Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">PromptPay ID</label>
            <input
              type="text"
              value={promptpayId}
              onChange={e => setPromptpayId(e.target.value)}
              placeholder="Phone number or National ID"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-xs text-zinc-600 mt-1">This is where all payouts are sent</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Auto-payout threshold</label>
            <select className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50">
              <option>Daily (automatic)</option>
              <option>Weekly (every Monday)</option>
              <option>Monthly (1st of month)</option>
              <option>Manual only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">Shipping Defaults</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Default Courier</label>
            <select className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50">
              <option>Kerry Express</option>
              <option>Flash Express</option>
              <option>J&T Express</option>
              <option>Thailand Post (EMS)</option>
              <option>Grab Express</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Default Shipping From</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Province"
              className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4 text-red-400">Danger Zone</h3>
        <button className="text-sm text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors">
          Pause All Listings
        </button>
      </div>
    </div>
  );
}

function AnalyticsTab({ listings, allSales }: { listings: ReturnType<typeof getActiveListings>; allSales: ReturnType<typeof getTransactionsWithDetails> }) {
  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalWatches = listings.reduce((s, l) => s + (l.watch_count || 0), 0);
  const conversionRate = totalViews > 0 ? ((allSales.length / totalViews) * 100).toFixed(1) : '0';

  // Sales by category from real data
  const catSales: Record<string, number> = {};
  allSales.forEach(s => {
    const cat = s.plant_id?.includes('aroid') ? 'aroid' :
      s.plant_id?.includes('hoya') ? 'hoya' :
      s.plant_id?.includes('succulent') ? 'succulent' :
      s.plant_id?.includes('fern') ? 'fern' :
      s.plant_id?.includes('orchid') ? 'orchid' : 'other';
    catSales[cat] = (catSales[cat] || 0) + 1;
  });
  const catEntries = Object.entries(catSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Listing Views', value: totalViews.toLocaleString(), change: '+12%', icon: Eye },
          { label: 'Watchlist Adds', value: totalWatches.toLocaleString(), change: '+5%', icon: Heart },
          { label: 'Message Inquiries', value: allSales.length.toLocaleString(), change: '+8%', icon: Megaphone },
          { label: 'Conversion Rate', value: `${conversionRate}%`, change: '+1.2%', icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <stat.icon className="w-4 h-4 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
            <p className={`text-xs ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">Per-Listing Performance</h3>
        {listings.length > 0 ? listings.slice(0, 5).map(l => (
          <div key={l.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{l.species?.common_name_en}</p>
              <p className="text-xs text-zinc-500">{l.price_thb.toLocaleString()} THB · {l.view_count || 0} views · {l.watch_count || 0} watches</p>
            </div>
            <Sparkline data={Array.from({ length: 20 }, (_, i) => seededRandom(l.id, i) * 100 + 50)} width={80} height={24} />
          </div>
        )) : <p className="text-zinc-600 text-sm py-4 text-center">No listings yet</p>}
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">Sales by Category</h3>
        <div className="space-y-2">
          {catEntries.length > 0 ? catEntries.map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-20 capitalize">{cat}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / catTotal) * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-500 w-8 text-right">{count}</span>
            </div>
          )) : <p className="text-zinc-600 text-sm py-4 text-center">No sales data yet</p>}
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ allSales }: { allSales: ReturnType<typeof getTransactionsWithDetails> }) {
  const avgRating = allSales.length > 0
    ? (allSales.reduce((s) => s + 5, 0) / allSales.length).toFixed(1)
    : '5.0';

  // Monthly sales from real data
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const monthly = Array(12).fill(0);
  allSales.forEach(s => {
    const d = new Date(s.created_at);
    monthly[d.getMonth()]++;
  });
  const maxMonth = Math.max(...monthly, 1);

  // Top buyers from real data
  const buyerMap: Record<string, { name: string; count: number; total: number }> = {};
  allSales.forEach(s => {
    const id = s.buyer_id || 'unknown';
    if (!buyerMap[id]) {
      buyerMap[id] = { name: s.buyer?.display_name || 'Unknown', count: 0, total: 0 };
    }
    buyerMap[id].count++;
    buyerMap[id].total += s.sale_price_thb;
  });
  const topBuyers = Object.values(buyerMap).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">Seller Score</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-semibold">{avgRating}</p>
              <p className="text-xs text-zinc-500">/ 5.0</p>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: 'Shipping Speed', score: Math.min(98, 70 + allSales.length * 2) },
              { label: 'Plant Condition', score: Math.min(98, 75 + allSales.length * 1.5) },
              { label: 'Communication', score: Math.min(98, 80 + allSales.length) },
              { label: 'Value for Money', score: Math.min(98, 72 + allSales.length * 1.2) },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-32">{item.label}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.score}%` }} />
                </div>
                <span className="text-xs text-zinc-500 w-8">{item.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">Monthly Sales Trend</h3>
        <div className="flex items-end gap-2 h-32">
          {monthly.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-emerald-500/20 rounded-t" style={{ height: `${(v / maxMonth) * 100 || 4}%`, minHeight: 4 }}>
                <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${(v / maxMonth) * 60 || 2}%`, minHeight: 2 }} />
              </div>
              <span className="text-[10px] text-zinc-600">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-3">Top Buyers</h3>
        <div className="space-y-2">
          {topBuyers.length > 0 ? topBuyers.map(b => (
            <div key={b.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium">{b.name.charAt(0)}</div>
                <div>
                  <p className="text-sm">{b.name}</p>
                  <p className="text-xs text-zinc-500">{b.count} purchase{b.count > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <p>{b.total.toLocaleString()} THB total</p>
              </div>
            </div>
          )) : (
            <p className="text-zinc-600 text-sm py-4 text-center">No buyer data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
