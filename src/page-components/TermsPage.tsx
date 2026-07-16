'use client'

import { useTranslation } from 'react-i18next';

const LISTING_RULES = [
  'ownership',
  'accuracy',
  'cites',
  'shipWithin48h',
  'attachQr',
];

const BUYING_RULES = [
  'payWithin15m',
  'confirmWithin48h',
  'livingOrganism',
  'openDispute',
];

export default function TermsPage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-light tracking-tight mb-2">{t('common:terms.title')}</h1>
        <p className="text-zinc-500 mb-8">{t('common:terms.lastUpdated', { date: 'June 1, 2025' })}</p>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.acceptance.title')}</h2>
            <p>{t('common:terms.acceptance.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.eligibility.title')}</h2>
            <p>{t('common:terms.eligibility.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.account.title')}</h2>
            <p>{t('common:terms.account.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.listing.title')}</h2>
            <p>{t('common:terms.listing.intro')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
              {LISTING_RULES.map(key => (
                <li key={key}>{t(`common:terms.listing.rules.${key}`)}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.buying.title')}</h2>
            <p>{t('common:terms.buying.intro')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
              {BUYING_RULES.map(key => (
                <li key={key}>{t(`common:terms.buying.rules.${key}`)}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.fees.title')}</h2>
            <p>{t('common:terms.fees.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.prohibited.title')}</h2>
            <p>{t('common:terms.prohibited.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.disputes.title')}</h2>
            <p>{t('common:terms.disputes.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.provenance.title')}</h2>
            <p>{t('common:terms.provenance.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.liability.title')}</h2>
            <p>{t('common:terms.liability.text')}</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">{t('common:terms.governingLaw.title')}</h2>
            <p>{t('common:terms.governingLaw.text')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
