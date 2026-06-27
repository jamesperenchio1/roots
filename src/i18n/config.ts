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

import thCommon from './locales/th/common.json';
import thHome from './locales/th/home.json';
import thAuth from './locales/th/auth.json';
import thMarketplace from './locales/th/marketplace.json';
import thDashboard from './locales/th/dashboard.json';
import thCheckout from './locales/th/checkout.json';
import thMessages from './locales/th/messages.json';

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
  th: {
    common: thCommon,
    home: thHome,
    auth: thAuth,
    marketplace: thMarketplace,
    dashboard: thDashboard,
    checkout: thCheckout,
    messages: thMessages,
  },
} as const;

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

export default i18n;
