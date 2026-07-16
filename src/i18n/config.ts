import i18n from 'i18next';

import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enAuth from './locales/en/auth.json';
import enMarketplace from './locales/en/marketplace.json';
import enDashboard from './locales/en/dashboard.json';
import enCheckout from './locales/en/checkout.json';
import enMessages from './locales/en/messages.json';
import enTutorial from './locales/en/tutorial.json';

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
    tutorial: enTutorial,
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
    { default: tutorial },
  ] = await Promise.all([
    import('./locales/th/common.json'),
    import('./locales/th/home.json'),
    import('./locales/th/auth.json'),
    import('./locales/th/marketplace.json'),
    import('./locales/th/dashboard.json'),
    import('./locales/th/checkout.json'),
    import('./locales/th/messages.json'),
    import('./locales/th/tutorial.json'),
  ]);
  i18n.addResourceBundle('th', 'common', common, true, true);
  i18n.addResourceBundle('th', 'home', home, true, true);
  i18n.addResourceBundle('th', 'auth', auth, true, true);
  i18n.addResourceBundle('th', 'marketplace', marketplace, true, true);
  i18n.addResourceBundle('th', 'dashboard', dashboard, true, true);
  i18n.addResourceBundle('th', 'checkout', checkout, true, true);
  i18n.addResourceBundle('th', 'messages', messages, true, true);
  i18n.addResourceBundle('th', 'tutorial', tutorial, true, true);
}

export type SupportedLanguage = 'en' | 'th';

const baseConfig = {
  resources,
  fallbackLng: 'en' as const,
  defaultNS,
  interpolation: {
    escapeValue: true,
  },
};

// Initialize the core i18next instance on both server and client. React-specific
// plugins are loaded dynamically in the browser so the config file remains safe
// for import in server-side code (e.g., App Router Server Components).
i18n.init(baseConfig);

if (typeof window !== 'undefined') {
  Promise.all([
    import('react-i18next'),
    import('i18next-browser-languagedetector'),
  ]).then(([{ initReactI18next }, { default: LanguageDetector }]) => {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        ...baseConfig,
        detection: {
          order: ['localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage'],
          lookupLocalStorage: 'roots-language',
        },
      });
    if (i18n.language?.startsWith('th')) {
      loadThaiResources().catch(() => {});
    }
  });
}

export default i18n;
