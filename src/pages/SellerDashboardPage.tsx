import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Package, DollarSign, TrendingUp, Plus, Eye, Heart,
  BarChart3, Truck, Wallet, ArrowDownLeft,
  Clock, CheckCircle, Users, Star,
  Megaphone, Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getActiveListings, getTransactionsWithDetails, PLANT_IMAGES, USERS,
  getSpeciesPriceStats
} from '@/data/mockData';
import { Sparkline } from '@/components/PriceChart';
import { ALL_SPECIES } from '@/data/speciesDatabase';

// Full payout detail mock data
const FULL_PAYOUTS = [
  {
    id: 'pay-1',
    date: '2025-05-28',
    status: 'completed',
    totalAmount: 9200,
    transactions: [
      { txId: 't-1', buyer: 'GreenHouse_BKK', plant: 'Monstera Thai Constellation', price: 5000, fee: 400, net: 4600 },
      { txId: 't-2', buyer: 'RarePlantTH', plant: 'Pink Princess', price: 5000, fee: 400, net: 4600 },
    ],
    method: 'PromptPay',
    destination: '081-234-5678',
    processedAt: '2025-05-28 14:32:00',
  },
  {
    id: 'pay-2',
    date: '2025-05-21',
    status: 'completed',
    totalAmount: 4600,
    transactions: [
      { txId: 't-3', buyer: 'UrbanJungle', plant: 'Anthurium Clarinervium', price: 5000, fee: 400, net: 4600 },
    ],
    method: 'PromptPay',
    destination: '081-234-5678',
    processedAt: '2025-05-21 09:15:00',
  },
  {
    id: 'pay-3',
    date: '2025-05-15',
    status: 'completed',
    totalAmount: 13800,
    transactions: [
      { txId: 't-4', buyer: 'AroidLover', plant: 'Hoya Linearis', price: 5000, fee: 400, net: 4600 },
      { txId: 't-5', buyer: 'HoyaCollector', plant: 'Crystal Anthurium', price: 5000, fee: 400, net: 4600 },
      { txId: 't-6', buyer: 'SucculentHub', plant: 'Melanochrysum', price: 5000, fee: 400, net: 4600 },
    ],
    method: 'PromptPay',
    destination: '081-234-5678',
    processedAt: '2025-05-15 16:45:00',
  },
  {
    id: 'pay-4',
    date: '2025-06-02',
    status: 'pending',
    totalAmount: 4600,
    transactions: [
      { txId: 't-7', buyer: 'PlantMama_BKK', plant: 'White Princess', price: 5000, fee: 400, net: 4600 },
    ],
    method: 'PromptPay',
    destination: '081-234-5678',
    processedAt: null,
  },
];

const TABS_DEF = [
  { id: 'listings', label: 'Listings', icon: Package },
  { id: 'sales', label: 'Sales', icon: DollarSign },
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
  const currentUserId = user?.id || 'u-1';

  useEffect(() => {
    if (tab && TABS_DEF.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab]);
  const me = USERS.find(u => u.id === currentUserId);
  const listings = getActiveListings().filter(l => l.seller_id === currentUserId);
  const allSales = getTransactionsWithDetails().filter(t => t.seller_id === currentUserId);
  const completedSales = allSales.filter(s => s.status === 'completed');
  const pendingSales = allSales.filter(s => s.status === 'paid_in_escrow' || s.status === 'shipped');
  const totalRevenue = completedSales.reduce((s, t) => s + t.seller_payout_thb, 0);
  const pendingRevenue = pendingSales.reduce((s, t) => s + t.seller_payout_thb, 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'listings':
        return (
          <div>
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
                        <img src={l.photos?.[0]?.storage_path || PLANT_IMAGES[l.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'} alt="" className="w-full h-full object-cover" />
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
                          <button className="text-xs text-zinc-500 hover:text-white">Edit</button>
                          <button className="text-xs text-red-400 hover:text-red-300">Withdraw</button>
                        </div>
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
                  <div key={s.id} className="bg-zinc-900/30 border border-amber-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Order #{s.id.slice(-4)} — {s.plant_id}</p>
                          <p className="text-xs text-zinc-500">Buyer: {s.buyer?.display_name} | {s.sale_price_thb.toLocaleString()} THB</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">{s.status}</span>
                        {s.status === 'paid_in_escrow' && (
                          <button className="block mt-2 text-xs text-emerald-400 hover:underline">Mark as Shipped</button>
                        )}
                        {s.status === 'shipped' && (
                          <p className="text-xs text-zinc-600 mt-1">Tracking: {s.tracking_number || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">No pending sales</p>
                )}
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
          </div>
        );

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
                {FULL_PAYOUTS.map(payout => (
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
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Listing Views', value: '1,234', change: '+12%', icon: Eye },
                { label: 'Watchlist Adds', value: '89', change: '+5%', icon: Heart },
                { label: 'Message Inquiries', value: '47', change: '+8%', icon: Megaphone },
                { label: 'Conversion Rate', value: '8.5%', change: '+1.2%', icon: TrendingUp },
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
              {listings.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{l.species?.common_name_en}</p>
                    <p className="text-xs text-zinc-500">{l.price_thb.toLocaleString()} THB · {l.view_count} views · {l.watch_count} watches</p>
                  </div>
                  <Sparkline data={Array.from({ length: 20 }, () => Math.random() * 100 + 50)} width={80} height={24} />
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-4">Sales by Category</h3>
              <div className="space-y-2">
                {(['aroid', 'hoya', 'foliage', 'succulent', 'herb'] as const).map((cat, i) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-20 capitalize">{cat}</span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${[45, 25, 15, 10, 5][i]}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-right">{[45, 25, 15, 10, 5][i]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            {/* Seller Score */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-4">Seller Score</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">4.9</p>
                    <p className="text-xs text-zinc-500">/ 5.0</p>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Shipping Speed', score: 98 },
                    { label: 'Plant Condition', score: 95 },
                    { label: 'Communication', score: 92 },
                    { label: 'Value for Money', score: 88 },
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

            {/* Monthly Trend */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-4">Monthly Sales Trend</h3>
              <div className="flex items-end gap-2 h-32">
                {[12, 18, 15, 22, 28, 35, 30, 42, 38, 45, 52, 48].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-emerald-500/20 rounded-t" style={{ height: `${v * 1.5}px` }}>
                      <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${v * 0.6}px` }} />
                    </div>
                    <span className="text-[10px] text-zinc-600">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Repeat Buyers */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-3">Top Buyers</h3>
              <div className="space-y-2">
                {USERS.filter(u => u.id !== currentUserId).slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium">{u.display_name.charAt(0)}</div>
                      <div>
                        <p className="text-sm">{u.display_name}</p>
                        <p className="text-xs text-zinc-500">{u.location}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>{Math.floor(Math.random() * 8 + 1)} purchases</p>
                      <p>{(3000 + Math.random() * 15000).toFixed(0)} THB total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-lg space-y-6">
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-4">Payout Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">PromptPay ID</label>
                  <input type="text" defaultValue={me?.promptpay_id || ''} placeholder="Phone number or National ID" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
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
                  <input type="text" defaultValue={me?.location || ''} placeholder="Province" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
              <h3 className="font-medium mb-4 text-red-400">Danger Zone</h3>
              <button className="text-sm text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors">
                Pause All Listings
              </button>
            </div>
          </div>
        );

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
                <img src={me.avatar_url} alt="" className="w-full h-full object-cover" />
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

function MapPinIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
