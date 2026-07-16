'use client'

import { useTranslation } from 'react-i18next';

const INFO_CATEGORIES = [
  { key: 'account', dataKey: 'accountData' },
  { key: 'shipping', dataKey: 'shippingData' },
  { key: 'payment', dataKey: 'paymentData' },
  { key: 'listings', dataKey: 'listingsData' },
  { key: 'transactions', dataKey: 'transactionsData' },
  { key: 'usage', dataKey: 'usageData' },
];

const USE_ITEMS = [
  'marketplace',
  'payments',
  'qr',
  'priceHistory',
  'disputes',
  'notifications',
  'fraud',
];

const SHARE_ITEMS = [
  'shipping',
  'contact',
  'omise',
  'legal',
];

export default function PrivacyPage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-light tracking-tight mb-2">{t('common:privacy.title')}</h1>
        <p className="text-zinc-500 mb-8">{t('common:privacy.lastUpdated', { date: 'June 1, 2025' })}</p>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.collect.title')}</h2>
            <p className="mb-3">{t('common:privacy.collect.intro')}</p>
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 space-y-2 text-sm">
              {INFO_CATEGORIES.map(cat => (
                <p key={cat.key}>
                  <span className="text-white">{t(`common:privacy.collect.categories.${cat.key}`)}:</span>{' '}
                  {t(`common:privacy.collect.categories.${cat.dataKey}`)}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.use.title')}</h2>
            <ul className="list-disc list-inside space-y-1 text-zinc-500">
              {USE_ITEMS.map(key => (
                <li key={key}>{t(`common:privacy.use.items.${key}`)}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.share.title')}</h2>
            <p>{t('common:privacy.share.intro')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
              {SHARE_ITEMS.map(key => (
                <li key={key}>{t(`common:privacy.share.items.${key}`)}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.priceData.title')}</h2>
            <p>{t('common:privacy.priceData.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.retention.title')}</h2>
            <p>{t('common:privacy.retention.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.security.title')}</h2>
            <p>{t('common:privacy.security.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.rights.title')}</h2>
            <p>{t('common:privacy.rights.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:privacy.contact.title')}</h2>
            <p>{t('common:privacy.contact.text')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
