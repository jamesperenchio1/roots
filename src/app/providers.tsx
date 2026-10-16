'use client';

import { useEffect } from 'react';
import '@/i18n/config';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import i18n, { baseConfig, loadThaiResources, DEFAULT_LANGUAGE, DETECT_BROWSER_LANGUAGE } from '@/i18n/config';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ErrorBoundary';
import HashRedirect from '@/components/HashRedirect';
import ChatWidget from '@/components/messaging/ChatWidget';

function LanguageDetectorSync() {
  useEffect(() => {
    let cancelled = false;
    import('i18next-browser-languagedetector')
      .then(async ({ default: LanguageDetector }) => {
        if (cancelled) return;
        await i18n
          .use(LanguageDetector)
          .use(initReactI18next)
          .init({
            ...baseConfig,
            detection: {
              // A visitor's explicit choice (localStorage) always wins; browser language only if enabled.
              order: DETECT_BROWSER_LANGUAGE ? ['localStorage', 'navigator', 'htmlTag'] : ['localStorage'],
              caches: ['localStorage'],
              lookupLocalStorage: 'roots-language',
            },
          });
        if (cancelled) return;
        const syncHtmlLang = (lng: string) => { document.documentElement.lang = lng || DEFAULT_LANGUAGE; };
        syncHtmlLang(i18n.language);
        i18n.on('languageChanged', syncHtmlLang);
        if (i18n.language?.startsWith('th') || DEFAULT_LANGUAGE === 'th') {
          loadThaiResources().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HashRedirect />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
            <ChatWidget />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
      <LanguageDetectorSync />
    </I18nextProvider>
  );
}
