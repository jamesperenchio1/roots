'use client'

import { CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BUYER_FEATURES = [
  'browse',
  'priceHistory',
  'watchlist',
  'escrow',
  'qrVerification',
];

const SELLER_FEATURES = [
  'freeListings',
  'qrTag',
  'priceHistory',
  'escrow',
  'promptPay',
];

const NO_CHARGES = [
  'listingFees',
  'subscriptions',
  'featured',
  'withdrawal',
  'currencyConversion',
];

export default function FeesPage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">{t('common:fees.title')}</h1>
          <p className="text-zinc-500">{t('common:fees.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8">
            <h2 className="text-lg font-medium mb-2">{t('common:fees.buyers.title')}</h2>
            <p className="text-4xl font-light text-emerald-400 mb-4">{t('common:fees.buyers.price')}</p>
            <ul className="space-y-3">
              {BUYER_FEATURES.map(key => (
                <li key={key} className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {t(`common:fees.buyers.features.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8">
            <h2 className="text-lg font-medium mb-2">{t('common:fees.sellers.title')}</h2>
            <p className="text-4xl font-light text-amber-400 mb-1">{t('common:fees.sellers.price')}</p>
            <p className="text-sm text-zinc-500 mb-4">{t('common:fees.sellers.note')}</p>
            <ul className="space-y-3">
              {SELLER_FEATURES.map(key => (
                <li key={key} className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {t(`common:fees.sellers.features.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">{t('common:fees.example.title')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t('common:fees.example.soldFor')}</span>
              <span>{t('common:fees.example.soldForValue', { value: '10,000', currency: t('common:currency') })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t('common:fees.example.platformFee')}</span>
              <span className="text-red-400">{t('common:fees.example.platformFeeValue', { value: '-800', currency: t('common:currency') })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t('common:fees.example.youReceive')}</span>
              <span className="text-emerald-400 font-medium">{t('common:fees.example.youReceiveValue', { value: '9,200', currency: t('common:currency') })}</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-zinc-600 mb-4">{t('common:fees.noCharges.title')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {NO_CHARGES.map(key => (
              <span key={key} className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full">
                <XCircle className="w-3 h-3" /> {t(`common:fees.noCharges.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
