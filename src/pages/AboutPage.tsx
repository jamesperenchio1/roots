import { Link } from 'react-router-dom';
import { Shield, TrendingUp, Truck, QrCode, Zap, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STATS = [
  { value: '47K+', labelKey: 'plantsListed' },
  { value: '12K+', labelKey: 'happyBuyers' },
  { value: '8,400+', labelKey: 'sellersActive' },
  { value: '฿24M', labelKey: 'gmvToDate' },
];

const VALUES = [
  { icon: Shield, key: 'transparency' },
  { icon: QrCode, key: 'provenance' },
  { icon: TrendingUp, key: 'data' },
  { icon: Truck, key: 'escrow' },
  { icon: Zap, key: 'fee' },
  { icon: Heart, key: 'everyPlant' },
];

const TEAM = [
  { name: 'Thawanrat S.', roleKey: 'thawanrat.role', bioKey: 'thawanrat.bio' },
  { name: 'Pongsiri K.', roleKey: 'pongsiri.role', bioKey: 'pongsiri.bio' },
  { name: 'Malai T.', roleKey: 'malai.role', bioKey: 'malai.bio' },
  { name: 'Chanida P.', roleKey: 'chanida.role', bioKey: 'chanida.bio' },
];

export default function AboutPage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">{t('common:about.title')}</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed">
            {t('common:about.intro')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {STATS.map((s, i) => (
            <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
              <p className="text-2xl font-semibold text-emerald-400">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{t(`common:about.stats.${s.labelKey}`)}</p>
            </div>
          ))}
        </div>

        {/* Origin Story */}
        <div className="mb-16">
          <h2 className="text-xl font-medium mb-4">{t('common:about.origin.title')}</h2>
          <div className="space-y-4 text-zinc-400 leading-relaxed">
            <p>{t('common:about.origin.p1')}</p>
            <p>{t('common:about.origin.p2')}</p>
            <p>{t('common:about.origin.p3')}</p>
            <p>{t('common:about.origin.p4')}</p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-xl font-medium mb-6">{t('common:about.values.title')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v, i) => (
              <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
                <v.icon className="w-6 h-6 text-emerald-400 mb-3" />
                <h3 className="font-medium mb-2">{t(`common:about.values.${v.key}.title`)}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{t(`common:about.values.${v.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-xl font-medium mb-6">{t('common:about.team.title')}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TEAM.map((member, i) => (
              <div key={i} className="flex gap-4 bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-medium shrink-0">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-emerald-400 mb-1">{t(`common:about.team.${member.roleKey}`)}</p>
                  <p className="text-sm text-zinc-500">{t(`common:about.team.${member.bioKey}`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8 text-center">
          <h2 className="text-xl font-medium mb-3">{t('common:about.cta.title')}</h2>
          <p className="text-zinc-500 mb-6">
            {t('common:about.cta.description')}
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">{t('common:about.cta.createAccount')}</Link>
            <Link to="/seller-dashboard" className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">{t('common:about.cta.sellerDashboard')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
