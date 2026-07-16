'use client'

import type { TFunction } from 'i18next';
import { Truck } from 'lucide-react';
import { OrderCard } from './OrderCard';
import type { Transaction } from '@/types';

interface OrdersTabProps {
  orders: Transaction[];
  orderFilter: string;
  setOrderFilter: (v: string) => void;
  onViewSlip: (path?: string) => void;
  onConfirmPayment: (id: string) => void;
  onShip: (id: string) => void;
  onDeliver: (id: string) => void;
  pendingRevenue: number;
  totalRevenue: number;
  pendingSales: Transaction[];
  completedSales: Transaction[];
  t: TFunction;
}

export function OrdersTab({ orders, orderFilter, setOrderFilter, onViewSlip, onConfirmPayment, onShip, onDeliver, pendingRevenue, totalRevenue, pendingSales, completedSales, t }: OrdersTabProps) {
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
            <button onClick={() => setOrderFilter('all')} className={`text-xs px-3 py-1.5 rounded-full border ${orderFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}>{t('dashboard:seller.all')}</button>
            {statusOptions.map((s) => (
              <button key={s} onClick={() => setOrderFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border ${orderFilter === s ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-zinc-400 hover:text-white'}`}>{t(`common:status.${s}`)}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {orders.length > 0 ? orders.map((o: Transaction) => (
          <OrderCard key={o.id} order={o} onViewSlip={onViewSlip} onConfirmPayment={onConfirmPayment} onShip={onShip} onDeliver={onDeliver} t={t} />
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
