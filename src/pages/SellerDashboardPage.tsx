import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, DollarSign, TrendingUp, Tag,
  BarChart3, Wallet, Users, Star,
  QrCode, Boxes, Store, MapPin,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getSignedSlipUrl, confirmPaymentReceived,
  withdrawListing, markListingSold, markOrderDelivered,
} from '@/lib/api';
import MarkShippedModal from '@/components/MarkShippedModal';
import { toast } from 'sonner';
import { useSellerListings } from '@/hooks/queries/useSellerListings';
import { useUserTransactions } from '@/hooks/queries/useUserData';
import { useOffers } from '@/hooks/queries/useUserData';

import { ConfirmModal } from '@/components/seller-dashboard/ConfirmModal';
import { ListingsTab } from '@/components/seller-dashboard/ListingsTab';
import { OrdersTab } from '@/components/seller-dashboard/OrdersTab';
import { OffersTab } from '@/components/seller-dashboard/OffersTab';
import { PayoutsTab, type PayoutItem } from '@/components/seller-dashboard/PayoutsTab';
import { AnalyticsTab } from '@/components/seller-dashboard/AnalyticsTab';
import { PerformanceTab } from '@/components/seller-dashboard/PerformanceTab';
import { InventoryTab } from '@/components/seller-dashboard/InventoryTab';
import { QrManagementTab } from '@/components/seller-dashboard/QrManagementTab';
import { AccountTab } from '@/components/seller-dashboard/AccountTab';

export default function SellerDashboardPage() {
  const { t } = useTranslation(['dashboard', 'common', 'checkout', 'auth', 'marketplace']);
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
    { id: 'account', label: t('dashboard:seller.account'), icon: Store },
  ], [t]);

  const [activeTab, setActiveTab] = useState(tab && TABS_DEF.some((ta) => ta.id === tab) ? tab : 'listings');
  const [shipModalOrder, setShipModalOrder] = useState<string | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState<string | null>(null);
  const [markSoldConfirm, setMarkSoldConfirm] = useState<string | null>(null);
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('all');

  const { data: listings = [] } = useSellerListings(user?.id);
  const { data: transactions = [] } = useUserTransactions(user?.id);
  const { data: offers = [] } = useOffers(user?.id);

  useEffect(() => {
    if (tab && TABS_DEF.some((ta) => ta.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab, TABS_DEF]);

  const me = user ?? undefined;
  const allSales = transactions.filter((t) => t.seller_id === user?.id);
  const completedSales = allSales.filter((s) => s.status === 'completed');
  const pendingSales = allSales.filter((s) => ['paid_in_escrow', 'shipped', 'disputed'].includes(s.status));
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
  }, [t]);

  const handleWithdraw = async (id: string) => {
    try {
      await withdrawListing(id);
      toast.success(t('common:actions.withdraw'));
      setWithdrawConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleMarkSold = async (id: string) => {
    try {
      if (!user) return;
      await markListingSold(id, user.id);
      toast.success(t('dashboard:seller.markedSold'));
      setMarkSoldConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await markOrderDelivered(orderId);
      toast.success(t('dashboard:seller.markedDelivered'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    }
  };

  const handleDuplicate = useCallback(async () => {
    toast.info(t('dashboard:seller.duplicateComingSoon'));
  }, [t]);

  const filteredOrders = orderFilter === 'all' ? allSales : allSales.filter((o) => o.status === orderFilter);

  const payouts: PayoutItem[] = completedSales.map((sale) => ({
    id: sale.id,
    date: (sale.completed_at || sale.created_at).slice(0, 10),
    status: 'completed' as const,
    totalAmount: sale.seller_payout_thb,
    method: t('dashboard:seller.payoutMethodValue'),
    destination: me?.promptpay_id || t('dashboard:seller.notSet'),
    processedAt: sale.completed_at ? sale.completed_at.replace('T', ' ').slice(0, 19) : null,
    transactions: [{
      orderId: sale.id,
      plant: sale.listing?.species?.common_name_en || sale.listing?.species?.scientific_name || t('common:unknown'),
      buyer: sale.buyer?.display_name || t('common:unknownUser'),
      price: sale.sale_price_thb,
      fee: sale.platform_fee_thb,
      net: sale.seller_payout_thb,
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
        {markSoldConfirm && (
          <ConfirmModal
            title={t('dashboard:seller.markAsSold')}
            description={t('dashboard:seller.markAsSoldConfirm')}
            onCancel={() => setMarkSoldConfirm(null)}
            onConfirm={() => handleMarkSold(markSoldConfirm)}
            confirmText={t('dashboard:seller.markAsSold')}
          />
        )}
        {shipModalOrder && (
          <MarkShippedModal orderId={shipModalOrder} onClose={() => setShipModalOrder(null)} onShipped={() => {}} />
        )}

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl font-medium overflow-hidden">
              {me?.avatar_url ? (
                <img src={me.avatar_url} alt={`${me?.display_name || t('common:unknownUser')} avatar`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                me?.display_name?.charAt(0) || '?'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-light truncate">{me?.display_name || t('dashboard:seller.title')}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {me?.rating || '4.9'}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {me?.sales_count || 0} {t('marketplace:seller.sales')}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {me?.location || t('dashboard:seller.defaultLocation')}</span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-zinc-500">{t('dashboard:seller.available')}</p>
              <p className="text-lg font-semibold text-emerald-400">{pendingRevenue.toLocaleString()} {t('common:currency')}</p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {TABS_DEF.map((ta) => (
            <button
              key={ta.id}
              onClick={() => { setActiveTab(ta.id); navigate(`/seller-dashboard/${ta.id}`, { replace: true }); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeTab === ta.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ta.icon className="w-4 h-4" />
              {ta.label}
            </button>
          ))}
        </div>

        {activeTab === 'listings' && (
          <ListingsTab listings={listings} sales={allSales} onWithdraw={setWithdrawConfirm} onMarkSold={setMarkSoldConfirm} onDuplicate={handleDuplicate} t={t} />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={filteredOrders} orderFilter={orderFilter} setOrderFilter={setOrderFilter} onViewSlip={handleViewSlip} onConfirmPayment={handleConfirmPayment} onShip={setShipModalOrder} onDeliver={handleMarkDelivered} pendingRevenue={pendingRevenue} totalRevenue={totalRevenue} pendingSales={pendingSales} completedSales={completedSales} t={t} />
        )}
        {activeTab === 'offers' && <OffersTab offers={offers} currentUserId={user?.id || ''} t={t} />}
        {activeTab === 'payouts' && <PayoutsTab payouts={payouts} expandedPayout={expandedPayout} setExpandedPayout={setExpandedPayout} totalRevenue={totalRevenue} completedSales={completedSales} pendingRevenue={pendingRevenue} pendingSales={pendingSales} t={t} />}
        {activeTab === 'analytics' && <AnalyticsTab listings={listings} allSales={allSales} t={t} />}
        {activeTab === 'performance' && <PerformanceTab allSales={allSales} t={t} />}
        {activeTab === 'inventory' && <InventoryTab listings={listings} t={t} />}
        {activeTab === 'qr' && <QrManagementTab listings={listings.filter((l) => l.has_qr_provenance !== false && l.plant_id)} t={t} />}
        {activeTab === 'account' && <AccountTab me={me} t={t} />}
      </div>
    </div>
  );
}
