'use client'


import Link from 'next/link';
import type { TFunction } from 'i18next';
import { ArrowDownLeft } from 'lucide-react';
import type { Transaction } from '@/types';

export interface TransactionPayoutItem {
  orderId: string;
  plant: string;
  buyer: string;
  price: number;
  fee: number;
  net: number;
}

export interface PayoutItem {
  id: string;
  date: string;
  status: 'completed';
  totalAmount: number;
  method: string;
  destination: string;
  processedAt: string | null;
  transactions: TransactionPayoutItem[];
}

interface PayoutsTabProps {
  payouts: PayoutItem[];
  expandedPayout: string | null;
  setExpandedPayout: (id: string | null) => void;
  totalRevenue: number;
  completedSales: Transaction[];
  pendingRevenue: number;
  pendingSales: Transaction[];
  t: TFunction;
}

export function PayoutsTab({ payouts, expandedPayout, setExpandedPayout, totalRevenue, completedSales, pendingRevenue, pendingSales, t }: PayoutsTabProps) {
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
          <p className="text-xl font-semibold">{t('dashboard:seller.payoutMethodValue')}</p>
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
                          <Link href={`/order/${tx.orderId}`} className="text-xs text-emerald-400 hover:underline">{t('common:actions.view')}</Link>
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
