import { useState, useEffect, useCallback, useSyncExternalStore, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Package, DollarSign, TrendingUp, Plus, Eye, Heart,
  BarChart3, Truck, Wallet, ArrowDownLeft, Users, Star,
  Megaphone, Settings, Tag, QrCode, Boxes, Store, MoreHorizontal, MapPin,
  Copy, Printer, Archive, Rocket, ScanSearch
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getActiveListings, getTransactionsWithDetails, USERS, getSpeciesPriceStats,
} from '@/data/mockData';
import {
  getOffersForSeller, respondToOffer, notifyOfferResponse, confirmPaymentReceived,
  getSignedSlipUrl, withdrawListing, updateProfile,
  hydrateUserTransactions, hydrateUserOffers, subscribeOffers, getOffersVersion
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import MarkShippedModal from '@/components/MarkShippedModal';
import OfferCard from '@/components/OfferCard';
import { toast } from 'sonner';
import { Sparkline } from '@/components/PriceChart';
import { ALL_SPECIES } from '@/data/speciesDatabase';
import { generateQR } from '@/lib/promptpay';
import type { Listing, Transaction } from '@/types';

interface TransactionPayoutItem {
  orderId: string;
  plant: string;
  buyer: string;
  price: number;
  fee: number;
  net: number;
}

interface PayoutItem {
  id: string;
  date: string;
  status: 'completed';
  totalAmount: number;
  method: string;
  destination: string;
  processedAt: string | null;
  transactions: TransactionPayoutItem[];
}

export default function SellerDashboardPage() {
  const { t } = useTranslation(['dashboard', 'common', 'checkout']);
  const { user } = useAuth();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const TABS_DEF = useMemo(() => [
    { id: 'listings', label: t('dashboard:seller.listings'), icon: Package },
    { id: 'orders', label: t('dashboard:seller.orders'), icon: DollarSign },
    { id: 'offers', label: t('dashboard:seller.offers'), icon: Tag },
    { id: 'payouts', label: t('dashboard:seller.payouts'), icon: Wallet },
    { id: 'analytics', label: t('dashboard:seller.analytics'), icon: BarChart3 },
    { id: 'performance', label: t('dashboard:seller.performance'), icon: TrendingUp },
    { id: 'inventory', label: t('dashboard:seller.inventory'), icon: Boxes },
    { id: 'qr', label: t('dashboard:seller.qrManagement'), icon: QrCode },
    { id: 'reviews', label: t('dashboard:seller.reviews'), icon: Star },
    { id: 'account', label: t('dashboard:seller.account'), icon: Store },
  ], [t]);

  const [activeTab, setActiveTab] = useState(tab && TABS_DEF.some(t => t.id === tab) ? tab : 'listings');
  const [shipModalOrder, setShipModalOrder] = useState<string | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState<string | null>(null);
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [, setRefreshKey] = useState(0);

  useSyncExternalStore(subscribeOffers, getOffersVersion);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (tab && TABS_DEF.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab, TABS_DEF]);

  useEffect(() => {
    if (activeTab !== 'orders' || !user) return;
    let cancelled = false;
    hydrateUserTransactions().then(() => { if (!cancelled) refresh(); });
    const channel = supabase
      .channel(`seller-transactions-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `seller_id=eq.${user.id}` }, () => {
        hydrateUserTransactions().then(() => { if (!cancelled) { refresh(); toast.info(t('dashboard:seller.newOrder')); } });
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeTab, user, refresh, t]);

  useEffect(() => {
    if (activeTab !== 'offers' || !user) return;
    let cancelled = false;
    hydrateUserOffers().then(() => { if (!cancelled) refresh(); });
    return () => { cancelled = true; };
  }, [activeTab, user, refresh]);

  const me = USERS.find(u => u.id === user?.id);
  const listings = getActiveListings().filter(l => l.seller_id === user?.id);
  const allSales = getTransactionsWithDetails().filter(t => t.seller_id === user?.id);
  const completedSales = allSales.filter(s => s.status === 'completed');
  const pendingSales = allSales.filter(s => ['paid_in_escrow', 'shipped', 'disputed'].includes(s.status));
  const totalRevenue = completedSales.reduce((s, t) => s + t.seller_payout_thb, 0);
  const pendingRevenue = pendingSales.reduce((s, t) => s + t.seller_payout_thb, 0);

  const handleViewSlip = useCallback(async (path?: string) => {
    if (!path) { toast.error(t('common:errors.generic')); return; }
    const url = await getSignedSlipUrl(path);
    if (url) window.open(url, '_blank', 'noopener');
    else toast.error(t('common:errors.generic'));
  }, [t]);

  const handleConfirmPayment = useCallback(async (orderId: string) => {
    await confirmPaymentReceived(orderId);
    toast.success(t('checkout:order.confirmPayment'));
    refresh();
  }, [refresh, t]);

  const handleWithdraw = async (id: string) => {
    try {
      await withdrawListing(id);
      toast.success(t('common:actions.withdraw'));
      setWithdrawConfirm(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleDuplicate = useCallback(async () => {
    toast.info(t('dashboard:seller.duplicateComingSoon'));
  }, [t]);

  const filteredOrders = orderFilter === 'all' ? allSales : allSales.filter(o => o.status === orderFilter);

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

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {withdrawConfirm && (
          <ConfirmModal
            title={t('common:actions.withdraw')}
            description={t('dashboard:seller.withdrawConfirm')}
            onCancel={() => setWithdrawConfirm(null)}
            onConfirm={() => handleWithdraw(withdrawConfirm)}
            confirmText={t('common:actions.withdraw')}
          />
        )}
        {shipModalOrder && (
          <MarkShippedModal orderId={shipModalOrder} onClose={() => setShipModalOrder(null)} onShipped={refresh} />
        )}

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl font-medium overflow-hidden">
              {me?.avatar_url ? (
                <img src={me.avatar_url} alt={`${me?.display_name || 'Seller'} avatar`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                me?.display_name?.charAt(0) || 'S'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-light truncate">{me?.display_name || t('dashboard:seller.title')}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {me?.rating || '4.9'}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {me?.sales_count || 0} {t('marketplace:seller.sales')}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {me?.location || 'Bangkok'}</span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-zinc-500">{t('dashboard:seller.available')}</p>
              <p className="text-lg font-semibold text-emerald-400">{pendingRevenue.toLocaleString()} {t('common:currency')}</p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {TABS_DEF.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); navigate(`/seller-dashboard/${t.id}`, { replace: true }); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'listings' && (
          <ListingsTab listings={listings} onWithdraw={setWithdrawConfirm} onDuplicate={handleDuplicate} t={t} />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={filteredOrders} orderFilter={orderFilter} setOrderFilter={setOrderFilter} onViewSlip={handleViewSlip} onConfirmPayment={handleConfirmPayment} onShip={setShipModalOrder} pendingRevenue={pendingRevenue} totalRevenue={totalRevenue} pendingSales={pendingSales} completedSales={completedSales} t={t} />
        )}
        {activeTab === 'offers' && <OffersTab currentUserId={user?.id || ''} refresh={refresh} t={t} />}
        {activeTab === 'payouts' && <PayoutsTab payouts={payouts} expandedPayout={expandedPayout} setExpandedPayout={setExpandedPayout} totalRevenue={totalRevenue} completedSales={completedSales} pendingRevenue={pendingRevenue} pendingSales={pendingSales} t={t} />}
        {activeTab === 'analytics' && <AnalyticsTab listings={listings} allSales={allSales} t={t} />}
        {activeTab === 'performance' && <PerformanceTab allSales={allSales} t={t} />}
        {activeTab === 'inventory' && <InventoryTab listings={listings} t={t} />}
        {activeTab === 'qr' && <QrManagementTab listings={listings} t={t} />}
        {activeTab === 'reviews' && <ReviewsTab t={t} />}
        {activeTab === 'account' && <AccountTab me={me} t={t} />}
      </div>
    </div>
  );
}

function ConfirmModal({ title, description, onCancel, onConfirm, confirmText }: {
  title: string; description: string; onCancel: () => void; onConfirm: () => void; confirmText: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function ListingsTab({ listings, onWithdraw, onDuplicate, t }: { listings: Listing[]; onWithdraw: (id: string) => void; onDuplicate: () => void; t: TFunction }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium">{t('dashboard:seller.activeListings')} ({listings.length})</h2>
          <p className="text-xs text-zinc-500">{t('dashboard:seller.manageListings')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/identify?returnTo=/seller-dashboard/listings/new" className="flex items-center gap-1.5 border border-white/10 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
            <ScanSearch className="w-4 h-4" /> Identify
          </Link>
          <Link to="/seller-dashboard/listings/new" className="flex items-center gap-1.5 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
            <Plus className="w-4 h-4" /> {t('dashboard:seller.newListing')}
          </Link>
        </div>
      </div>

      <div className="grid gap-3">
        {listings.map(l => {
          const speciesData = ALL_SPECIES.find(s => l.plant_id?.includes(s.id));
          const price30d = getSpeciesPriceStats(l.plant_id?.replace('p-', 'sp-') || '', 30);
          const vsMarket = price30d ? ((l.price_thb - price30d.median) / price30d.median * 100).toFixed(0) : '0';
          return (
            <div key={l.id} className="group bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/15 hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-4">
                <Link to={`/listing/${l.id}`} className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                  <img src={l.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt={l.species?.scientific_name || 'Plant listing'} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link to={`/listing/${l.id}`} className="font-medium truncate hover:text-emerald-400 transition-colors">{l.species?.common_name_en || speciesData?.common_name_en || 'Unknown Plant'}</Link>
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 shrink-0">{t(`common:status.${l.status}`)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mb-2">{l.species?.scientific_name || speciesData?.scientific_name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span className="text-emerald-400 font-semibold">{l.price_thb.toLocaleString()} {t('common:currency')}</span>
                    <span>{l.size_category}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.view_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {l.watch_count || 0}</span>
                    <span>{l.delivery_options?.join(' + ')}</span>
                    <span className={parseFloat(vsMarket) > 20 ? 'text-amber-400' : parseFloat(vsMarket) < -20 ? 'text-emerald-400' : 'text-zinc-500'}>{parseFloat(vsMarket) > 0 ? '+' : ''}{vsMarket}%</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <ListingActions listing={l} onWithdraw={onWithdraw} onDuplicate={onDuplicate} t={t} />
                </div>
              </div>
            </div>
          );
        })}
        {listings.length === 0 && (
          <div className="text-center py-12 bg-zinc-900/20 rounded-xl">
            <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 mb-1">{t('dashboard:seller.noListings')}</p>
            <p className="text-zinc-600 text-sm mb-4">{t('dashboard:seller.createFirst')}</p>
            <Link to="/seller-dashboard/listings/new" className="text-emerald-400 text-sm hover:underline">{t('dashboard:seller.newListing')}</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingActions({ listing, onWithdraw, onDuplicate, t }: { listing: Listing; onWithdraw: (id: string) => void; onDuplicate: () => void; t: TFunction }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-20 py-1">
          <Link to={`/listing/${listing.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Eye className="w-3.5 h-3.5" /> {t('common:actions.view')}</Link>
          <Link to={`/listing/${listing.id}/edit`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Settings className="w-3.5 h-3.5" /> {t('common:actions.edit')}</Link>
          <button onClick={() => { onDuplicate(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Copy className="w-3.5 h-3.5" /> {t('common:actions.duplicate')}</button>
          <button onClick={() => { onWithdraw(listing.id); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-white/5"><Archive className="w-3.5 h-3.5" /> {t('common:actions.withdraw')}</button>
          <Link to={`/p/${listing.plant_id || listing.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Printer className="w-3.5 h-3.5" /> {t('common:actions.print')} QR</Link>
          <button onClick={() => { toast.info(t('dashboard:seller.boostComingSoon')); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"><Rocket className="w-3.5 h-3.5" /> {t('common:actions.boost')}</button>
        </div>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  );
}

function OrdersTab({ orders, orderFilter, setOrderFilter, onViewSlip, onConfirmPayment, onShip, pendingRevenue, totalRevenue, pendingSales, completedSales, t }: { orders: Transaction[]; orderFilter: string; setOrderFilter: (v: string) => void; onViewSlip: (path?: string) => void; onConfirmPayment: (id: string) => void; onShip: (id: string) => void; pendingRevenue: number; totalRevenue: number; pendingSales: Transaction[]; completedSales: Transaction[]; t: TFunction }) {
  const statusOptions = ['pending_payment', 'paid_in_escrow', 'shipped', 'delivered', 'completed', 'refunded', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{t('dashboard:seller.pendingRevenue')}</p>
          <p className="text-lg font-semibold text-amber-400">{pendingRevenue.toLocaleString()} {t('common:currency')}</p>
          <p className="text-xs text-zinc-600 mt-1">{pendingSales.length} {t('dashboard:seller.orders')}</p>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{t('dashboard:seller.totalRevenue')}</p>
          <p className="text-lg font-semibold text-emerald-400">{totalRevenue.toLocaleString()} {t('common:currency')}</p>
          <p className="text-xs text-zinc-600 mt-1">{completedSales.length} {t('marketplace:seller.sales')}</p>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 col-span-2">
          <p className="text-xs text-zinc-500 mb-2">{t('dashboard:seller.filterByStatus')}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOrderFilter('all')} className={`text-xs px-3 py-1.5 rounded-full border ${orderFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}>All</button>
            {statusOptions.map(s => (
              <button key={s} onClick={() => setOrderFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border ${orderFilter === s ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}>{t(`common:status.${s}`)}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? orders.map((o: Transaction) => (
          <OrderCard key={o.id} order={o} onViewSlip={onViewSlip} onConfirmPayment={onConfirmPayment} onShip={onShip} t={t} />
        )) : (
          <div className="text-center py-12 bg-zinc-900/20 rounded-xl">
            <Truck className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">{t('dashboard:seller.noOrders')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onViewSlip, onConfirmPayment, onShip, t }: { order: Transaction; onViewSlip: (path?: string) => void; onConfirmPayment: (id: string) => void; onShip: (id: string) => void; t: TFunction }) {
  const timeline = ['pending_payment', 'paid_in_escrow', 'shipped', 'delivered', 'completed'];
  const step = timeline.indexOf(order.status);

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('checkout:order.title')} #{order.id.slice(-4)}</p>
            <p className="text-xs text-zinc-500">{order.buyer?.display_name} · {order.listing?.species?.common_name_en || order.plant_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : order.status === 'cancelled' || order.status === 'refunded' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {t(`common:status.${order.status}`)}
          </span>
          <span className="text-sm font-semibold">{order.sale_price_thb.toLocaleString()} {t('common:currency')}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-4 mb-3">
        {timeline.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1">
            <div className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {order.status === 'paid_in_escrow' && !order.payment_confirmed && (
          <>
            <button onClick={() => onViewSlip(order.payment_slip_path)} className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-zinc-300">{t('checkout:order.viewSlip')}</button>
            <button onClick={() => onConfirmPayment(order.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-medium hover:bg-emerald-600">{t('checkout:order.confirmPayment')}</button>
          </>
        )}
        {order.status === 'paid_in_escrow' && order.payment_confirmed && (
          <button onClick={() => onShip(order.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-medium hover:bg-emerald-600">{t('checkout:order.markShipped')}</button>
        )}
        {order.status === 'shipped' && order.tracking_number && (
          <span className="text-zinc-500">{t('checkout:order.tracking')}: {order.tracking_number}</span>
        )}
        <Link to={`/order/${order.id}`} className="ml-auto text-emerald-400 hover:underline">{t('common:actions.view')} {t('checkout:order.title')}</Link>
      </div>
    </div>
  );
}

function OffersTab({ currentUserId, refresh, t }: { currentUserId: string; refresh: () => void; t: TFunction }) {
  const offers = getOffersForSeller(currentUserId);
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const otherOffers = offers.filter(o => o.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-1">{t('dashboard:seller.incomingOffers')} ({pendingOffers.length} {t('common:status.pending')})</h2>
        <p className="text-xs text-zinc-500 mb-3">{t('dashboard:seller.respondToOffers')}</p>
        <div className="space-y-3">
          {pendingOffers.length > 0 ? pendingOffers.map(o => (
            <OfferCard key={o.id} offer={o} mode="seller" onRespond={async (status: 'accepted' | 'rejected' | 'countered', counterPrice?: number) => {
              try {
                await respondToOffer(o.id, status, counterPrice);
                if (status === 'accepted' || status === 'rejected' || status === 'countered') {
                  await notifyOfferResponse(o.buyer_id || '', o.id, status);
                }
                toast.success(t('dashboard:seller.offerResponded'));
                refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
              }
            }} />
          )) : (
            <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noPendingOffers')}</p>
          )}
        </div>
      </div>
      {otherOffers.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-1">{t('dashboard:seller.pastOffers')}</h2>
          <div className="space-y-3">
            {otherOffers.map(o => <OfferCard key={o.id} offer={o} mode="seller" />)}
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutsTab({ payouts, expandedPayout, setExpandedPayout, totalRevenue, completedSales, pendingRevenue, pendingSales, t }: { payouts: PayoutItem[]; expandedPayout: string | null; setExpandedPayout: (id: string | null) => void; totalRevenue: number; completedSales: Transaction[]; pendingRevenue: number; pendingSales: Transaction[]; t: TFunction }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{t('dashboard:seller.availableBalance')}</p>
          <p className="text-xl font-semibold text-emerald-400">{pendingRevenue.toLocaleString()} {t('common:currency')}</p>
          <p className="text-xs text-zinc-600 mt-1">{pendingSales.length} {t('dashboard:seller.pendingOrders')}</p>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{t('dashboard:seller.totalPaidOut')}</p>
          <p className="text-xl font-semibold">{totalRevenue.toLocaleString()} {t('common:currency')}</p>
          <p className="text-xs text-zinc-600 mt-1">{completedSales.length} {t('dashboard:seller.transactions')}</p>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{t('dashboard:seller.totalFees')}</p>
          <p className="text-xl font-semibold text-amber-400">{completedSales.reduce((sum: number, sale: Transaction) => sum + sale.platform_fee_thb, 0).toLocaleString()} {t('common:currency')}</p>
          <p className="text-xs text-zinc-600 mt-1">8% {t('dashboard:seller.perSale')}</p>
        </div>
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{t('dashboard:seller.payoutMethod')}</p>
          <p className="text-xl font-semibold">PromptPay</p>
          <p className="text-xs text-zinc-600 mt-1 truncate">{payouts[0]?.destination || t('dashboard:seller.notSet')}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-1">{t('dashboard:seller.payoutHistory')}</h2>
        <p className="text-xs text-zinc-500 mb-3">{t('dashboard:seller.payoutHistorySubtitle')}</p>
        <div className="space-y-3">
          {payouts.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noPayouts')}</p>}
          {payouts.map((payout: PayoutItem) => (
            <div key={payout.id} className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedPayout(expandedPayout === payout.id ? null : payout.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><ArrowDownLeft className="w-5 h-5 text-emerald-400" /></div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{t('dashboard:seller.payout')} #{payout.id.slice(-4)}</p>
                    <p className="text-xs text-zinc-500">{payout.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{payout.totalAmount.toLocaleString()} {t('common:currency')}</p>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{t('common:status.completed')}</span>
                </div>
              </button>
              {expandedPayout === payout.id && (
                <div className="border-t border-white/5 px-4 pb-4">
                  <div className="mt-3 space-y-2">
                    {payout.transactions.map((tx: TransactionPayoutItem, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2 border-t border-white/5">
                        <div>
                          <p className="font-medium">{tx.plant}</p>
                          <p className="text-xs text-zinc-500">{tx.buyer}</p>
                          <Link to={`/order/${tx.orderId}`} className="text-xs text-emerald-400 hover:underline">{t('common:actions.view')}</Link>
                        </div>
                        <div className="text-right">
                          <p>{tx.price.toLocaleString()} {t('common:currency')}</p>
                          <p className="text-xs text-amber-400">-{tx.fee.toLocaleString()}</p>
                          <p className="text-emerald-400 font-medium">{tx.net.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ listings, allSales, t }: { listings: Listing[]; allSales: Transaction[]; t: TFunction }) {
  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalWatches = listings.reduce((s, l) => s + (l.watch_count || 0), 0);
  const conversionRate = totalViews > 0 ? ((allSales.length / totalViews) * 100).toFixed(1) : '0';

  const catSales: Record<string, number> = {};
  allSales.forEach(s => {
    const cat = s.plant_id?.includes('aroid') ? 'aroid' : s.plant_id?.includes('hoya') ? 'hoya' : s.plant_id?.includes('succulent') ? 'succulent' : s.plant_id?.includes('fern') ? 'fern' : s.plant_id?.includes('orchid') ? 'orchid' : 'other';
    catSales[cat] = (catSales[cat] || 0) + 1;
  });
  const catEntries = Object.entries(catSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('dashboard:seller.totalViews'), value: totalViews.toLocaleString(), icon: Eye },
          { label: t('dashboard:seller.watchlistAdds'), value: totalWatches.toLocaleString(), icon: Heart },
          { label: t('dashboard:seller.messageInquiries'), value: allSales.length.toLocaleString(), icon: Megaphone },
          { label: t('dashboard:seller.conversionRate'), value: `${conversionRate}%`, icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <stat.icon className="w-4 h-4 text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.popularListings')}</h3>
        {listings.length > 0 ? listings.slice(0, 5).map(l => (
          <div key={l.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{l.species?.common_name_en}</p>
              <p className="text-xs text-zinc-500">{l.price_thb.toLocaleString()} {t('common:currency')} · {l.view_count || 0} {t('marketplace:listing.views')} · {l.watch_count || 0} {t('marketplace:listing.watches')}</p>
            </div>
            <Sparkline data={Array.from({ length: 20 }, (_, i) => seededRandom(l.id, i) * 100 + 50)} width={80} height={24} />
          </div>
        )) : <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noListings')}</p>}
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.salesByCategory')}</h3>
        <div className="space-y-2">
          {catEntries.length > 0 ? catEntries.map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-20 capitalize">{cat}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / catTotal) * 100}%` }} /></div>
              <span className="text-xs text-zinc-500 w-8 text-right">{count}</span>
            </div>
          )) : <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noSalesData')}</p>}
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ allSales, t }: { allSales: Transaction[]; t: TFunction }) {
  const avgRating = '5.0';
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const monthly = Array(12).fill(0);
  allSales.forEach(s => { const d = new Date(s.created_at); monthly[d.getMonth()]++; });
  const maxMonth = Math.max(...monthly, 1);

  const buyerMap: Record<string, { name: string; count: number; total: number }> = {};
  allSales.forEach(s => {
    const id = s.buyer_id || 'unknown';
    if (!buyerMap[id]) buyerMap[id] = { name: s.buyer?.display_name || 'Unknown', count: 0, total: 0 };
    buyerMap[id].count++; buyerMap[id].total += s.sale_price_thb;
  });
  const topBuyers = Object.values(buyerMap).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.sellerScore')}</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center">
            <div className="text-center"><p className="text-2xl font-semibold">{avgRating}</p><p className="text-xs text-zinc-500">/ 5.0</p></div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: t('dashboard:seller.shippingSpeed'), score: Math.min(98, 70 + allSales.length * 2) },
              { label: t('dashboard:seller.plantCondition'), score: Math.min(98, 75 + allSales.length * 1.5) },
              { label: t('dashboard:seller.communication'), score: Math.min(98, 80 + allSales.length) },
              { label: t('dashboard:seller.valueForMoney'), score: Math.min(98, 72 + allSales.length * 1.2) },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-32">{item.label}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.score}%` }} /></div>
                <span className="text-xs text-zinc-500 w-8">{item.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.monthlyTrend')}</h3>
        <div className="flex items-end gap-2 h-32">
          {monthly.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-emerald-500/20 rounded-t" style={{ height: `${(v / maxMonth) * 100 || 4}%`, minHeight: 4 }}><div className="w-full bg-emerald-500 rounded-t" style={{ height: `${(v / maxMonth) * 60 || 2}%`, minHeight: 2 }} /></div>
              <span className="text-[10px] text-zinc-600">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-3">{t('dashboard:seller.topBuyers')}</h3>
        <div className="space-y-2">
          {topBuyers.length > 0 ? topBuyers.map(b => (
            <div key={b.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium">{b.name.charAt(0)}</div>
                <div><p className="text-sm">{b.name}</p><p className="text-xs text-zinc-500">{b.count} {t('marketplace:seller.sales')}</p></div>
              </div>
              <div className="text-right text-xs text-zinc-500"><p>{b.total.toLocaleString()} {t('common:currency')}</p></div>
            </div>
          )) : <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noBuyerData')}</p>}
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ listings, t }: { listings: Listing[]; t: TFunction }) {
  return (
    <div>
      <h2 className="text-lg font-medium mb-4">{t('dashboard:seller.inventory')}</h2>
      <div className="space-y-3">
        {listings.map(l => (
          <div key={l.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <img src={l.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-medium">{l.species?.common_name_en || 'Unknown'}</p>
                <p className="text-xs text-zinc-500">{l.price_thb.toLocaleString()} {t('common:currency')}</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400">{t('dashboard:seller.singleItem')}</span>
          </div>
        ))}
        {listings.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noListings')}</p>}
      </div>
    </div>
  );
}

function QrManagementTab({ listings, t }: { listings: Listing[]; t: TFunction }) {
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        listings.map(async (l) => {
          const plantId = l.plant_id || l.id;
          try {
            const { fetchPlant } = await import('@/lib/api');
            const plant = await fetchPlant(plantId);
            if (plant?.qr_signature) map[plantId] = plant.qr_signature;
          } catch {
            // ignore
          }
        })
      );
      if (active) setSignatures(map);
    };
    load();
    return () => { active = false; };
  }, [listings]);

  const handleDownload = async (l: Listing) => {
    try {
      const plantId = l.plant_id || l.id;
      const signature = signatures[plantId] || '';
      const url = `${window.location.origin}/#/p/${plantId}${signature ? `?s=${signature}` : ''}`;
      const qrUrl = await generateQR(url, 512);
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `root-qr-${plantId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('dashboard:seller.qrDownloaded'));
    } catch {
      toast.error(t('common:errors.generic'));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">{t('dashboard:seller.qrManagement')}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map(l => {
          const plantId = l.plant_id || l.id;
          const signature = signatures[plantId] || '';
          return (
            <div key={l.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={l.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.species?.common_name_en || l.species?.common_name_th || l.species?.scientific_name || 'Unknown'}</p>
                  <p className="text-xs text-zinc-500 truncate">{plantId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/p/${plantId}${signature ? `?s=${signature}` : ''}`} className="flex-1 text-center px-3 py-2 rounded-lg border border-white/10 text-xs hover:bg-white/5">{t('common:actions.view')}</Link>
                <button onClick={() => handleDownload(l)} className="flex-1 text-center px-3 py-2 rounded-lg bg-emerald-500 text-black text-xs font-medium hover:bg-emerald-600">{t('common:actions.download')}</button>
              </div>
            </div>
          );
        })}
        {listings.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center col-span-full">{t('dashboard:seller.noListings')}</p>}
      </div>
    </div>
  );
}

function ReviewsTab({ t }: { t: TFunction }) {
  return (
    <div className="text-center py-16 bg-zinc-900/20 rounded-xl">
      <Star className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
      <p className="text-zinc-500 mb-2">{t('dashboard:seller.reviews')}</p>
      <p className="text-zinc-600 text-sm">{t('dashboard:seller.reviewsComingSoon')}</p>
    </div>
  );
}

function AccountTab({ me, t }: { me?: typeof USERS[0]; t: TFunction }) {
  const { user, refreshProfile } = useAuth();
  const [promptpayId, setPromptpayId] = useState(me?.promptpay_id ?? '');
  const [location, setLocation] = useState(me?.location ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { promptpay_id: promptpayId || undefined, location: location || undefined, updated_at: new Date().toISOString() });
      await refreshProfile();
      toast.success(t('dashboard:buyer.settingsSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.paymentSettings')}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">PromptPay ID</label>
            <input type="text" value={promptpayId} onChange={e => setPromptpayId(e.target.value)} placeholder="Phone number or National ID" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
            <p className="text-xs text-zinc-600 mt-1">{t('dashboard:seller.payoutDestination')}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.shippingSettings')}</h3>
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.location')}</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('auth:signup.location')} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50">
        {saving ? t('common:actions.saving') : t('common:actions.save')}
      </button>
    </div>
  );
}

function seededRandom(seed: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(hash + index) * 10000 % 1);
}
