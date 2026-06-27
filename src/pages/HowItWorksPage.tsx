import { Link } from 'react-router-dom';
import { QrCode, ShoppingCart, Truck, ScanLine, Shield, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STEPS = [
  { icon: ShoppingCart, key: 'browse', color: 'text-emerald-400' },
  { icon: QrCode, key: 'sellerQr', color: 'text-purple-400' },
  { icon: Shield, key: 'escrow', color: 'text-blue-400' },
  { icon: Truck, key: 'ship', color: 'text-amber-400' },
  { icon: ScanLine, key: 'scan', color: 'text-cyan-400' },
  { icon: TrendingUp, key: 'priceHistory', color: 'text-pink-400' },
];

export default function HowItWorksPage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">{t('common:howItWorksPage.title')}</h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            {t('common:howItWorksPage.subtitle')}
          </p>
        </div>

        <div className="space-y-12">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-6">
              <div className="shrink-0">
                <div className={`w-14 h-14 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center ${step.color}`}>
                  <step.icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium mb-2">{t(`common:howItWorksPage.steps.${step.key}.title`)}</h2>
                <p className="text-zinc-400 leading-relaxed">{t(`common:howItWorksPage.steps.${step.key}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-zinc-900/30 border border-white/5 rounded-xl p-8 text-center">
          <h2 className="text-xl font-medium mb-3">{t('common:howItWorksPage.cta.title')}</h2>
          <p className="text-zinc-500 mb-6">
            {t('common:howItWorksPage.cta.description')}
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
              {t('common:howItWorksPage.cta.signUp')}
            </Link>
            <Link to="/browse" className="border border-white/20 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">
              {t('common:howItWorksPage.cta.browse')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
