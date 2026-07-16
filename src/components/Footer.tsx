'use client'


import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Leaf, Instagram, MessageCircle } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation(['common', 'home']);

  return (
    <footer className="bg-zinc-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-emerald-400" />
              <span className="text-lg font-semibold tracking-tight">ROOTS</span>
            </Link>
            <p className="text-sm text-zinc-500 mb-4 max-w-xs leading-relaxed">
              {t('home:newHero.subheadline')}
            </p>
            <div className="flex items-center gap-1">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label={t('common:footer.socialInstagram')} className="p-2.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"><Instagram className="w-4 h-4" /></a>
              <Link href="/contact" aria-label={t('common:nav.contact')} className="p-2.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"><MessageCircle className="w-4 h-4" /></Link>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">{t('common:nav.browse')}</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><Link href="/browse" className="hover:text-white transition-colors">{t('common:nav.browse')}</Link></li>
              <li><Link href="/market" className="hover:text-white transition-colors">{t('common:nav.market')}</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">{t('home:sections.howItWorks')}</Link></li>
              <li><Link href="/fees" className="hover:text-white transition-colors">{t('common:nav.fees')}</Link></li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">{t('common:nav.sellerDashboard')}</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><Link href="/seller-dashboard/listings/new" className="hover:text-white transition-colors">{t('common:nav.sell')}</Link></li>
              <li><Link href="/seller-dashboard" className="hover:text-white transition-colors">{t('common:nav.sellerDashboard')}</Link></li>
              <li><Link href="/seller-dashboard/payouts" className="hover:text-white transition-colors">{t('dashboard:seller.payouts')}</Link></li>
              <li><Link href="/provenance" className="hover:text-white transition-colors">{t('common:nav.qrProvenance')}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">{t('common:footer.company')}</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><Link href="/about" className="hover:text-white transition-colors">{t('common:nav.about')}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t('common:actions.contactUs')}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">{t('common:terms.title')}</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t('common:privacy.title')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">{t('common:footer.copyright')}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">{t('common:footer.termsShort')}</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">{t('common:footer.privacyShort')}</Link>
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">{t('common:actions.contactUs')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
