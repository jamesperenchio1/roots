'use client'


import Link from 'next/link';
import { QrCode, Shield, History, BadgeCheck, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FEATURES = [
  { icon: BadgeCheck, key: 'verified' },
  { icon: History, key: 'history' },
  { icon: Shield, key: 'fraud' },
];

const SECTIONS = [
  { key: 'why' },
  { key: 'how' },
  { key: 'protects' },
  { key: 'privacy' },
];

// The single, canonical explanation of Root Provenance. Everywhere else links
// here instead of repeating the copy.
export default function ProvenancePage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 max-w-3xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> {t('common:actions.back')}
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <QrCode className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-light tracking-tight">{t('common:provenance.title')}</h1>
      </div>
      <p className="text-zinc-400 mb-10 leading-relaxed">
        {t('common:provenance.description')}
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {FEATURES.map((c) => (
          <div key={c.key} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
            <c.icon className="w-5 h-5 text-emerald-400 mb-3" />
            <h3 className="font-medium mb-1">{t(`common:provenance.features.${c.key}.title`)}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{t(`common:provenance.features.${c.key}.desc`)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8 text-zinc-300 leading-relaxed">
        {SECTIONS.map((section) => (
          <section key={section.key}>
            <h2 className="text-xl font-medium mb-2 text-white">{t(`common:provenance.sections.${section.key}.title`)}</h2>
            {section.key === 'how' ? (
              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                {[0, 1, 2, 3].map(i => (
                  <li key={i}>{t(`common:provenance.sections.${section.key}.items.${i}`)}</li>
                ))}
              </ol>
            ) : (
              <p className="text-zinc-400">{t(`common:provenance.sections.${section.key}.text`)}</p>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
        <p className="text-sm text-zinc-300 mb-4">{t('common:provenance.cta.description')}</p>
        <Link href="/sell" className="inline-flex items-center gap-2 bg-emerald-500 text-black px-5 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors">
          {t('common:provenance.cta.button')}
        </Link>
      </div>
    </div>
  );
}
