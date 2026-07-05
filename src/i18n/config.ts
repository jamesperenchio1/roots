import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enAuth from './locales/en/auth.json';
import enMarketplace from './locales/en/marketplace.json';
import enDashboard from './locales/en/dashboard.json';
import enCheckout from './locales/en/checkout.json';
import enMessages from './locales/en/messages.json';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: enCommon,
    home: enHome,
    auth: enAuth,
    marketplace: enMarketplace,
    dashboard: enDashboard,
    checkout: enCheckout,
    messages: enMessages,
  },
} as const;

export async function loadThaiResources() {
  const [
    { default: common },
    { default: home },
    { default: auth },
    { default: marketplace },
    { default: dashboard },
    { default: checkout },
    { default: messages },
  ] = await Promise.all([
    import('./locales/th/common.json'),
    import('./locales/th/home.json'),
    import('./locales/th/auth.json'),
    import('./locales/th/marketplace.json'),
    import('./locales/th/dashboard.json'),
    import('./locales/th/checkout.json'),
    import('./locales/th/messages.json'),
  ]);
  i18n.addResourceBundle('th', 'common', common, true, true);
  i18n.addResourceBundle('th', 'home', home, true, true);
  i18n.addResourceBundle('th', 'auth', auth, true, true);
  i18n.addResourceBundle('th', 'marketplace', marketplace, true, true);
  i18n.addResourceBundle('th', 'dashboard', dashboard, true, true);
  i18n.addResourceBundle('th', 'checkout', checkout, true, true);
  i18n.addResourceBundle('th', 'messages', messages, true, true);
}

export type SupportedLanguage = 'en' | 'th';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS,
    interpolation: {
      escapeValue: true,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'roots-language',
    },
  });

if (i18n.language?.startsWith('th')) {
  loadThaiResources().catch(() => {});
}

export default i18n;
