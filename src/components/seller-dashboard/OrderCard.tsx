'use client'


import Link from 'next/link';
import type { TFunction } from 'i18next';
import { Package } from 'lucide-react';
import type { Transaction } from '@/types';

interface OrderCardProps {
  order: Transaction;
  onViewSlip: (path?: string) => void;
  onConfirmPayment: (id: string) => void;
  onShip: (id: string) => void;
  onDeliver: (id: string) => void;
  t: TFunction;
}

export function OrderCard({ order, onViewSlip, onConfirmPayment, onShip, onDeliver, t }: OrderCardProps) {
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
        {order.status === 'shipped' && (
          <button onClick={() => onDeliver(order.id)} className="px-3 py-1.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600">{t('checkout:order.markDelivered')}</button>
        )}
        {order.status === 'shipped' && order.tracking_number && (
          <span className="text-zinc-500">{t('checkout:order.tracking')}: {order.tracking_number}</span>
        )}
        <Link href={`/order/${order.id}`} className="ml-auto text-emerald-400 hover:underline">{t('common:actions.view')} {t('checkout:order.title')}</Link>
      </div>
    </div>
  );
}
