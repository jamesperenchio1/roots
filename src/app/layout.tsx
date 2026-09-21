import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';
import TutorialModalWrapper from '@/components/TutorialModalWrapper';
import '@/index.css';

export const metadata: Metadata = {
  title: { default: 'Roots — Thai Plant Marketplace', template: '%s | Roots' },
  description: 'Buy and sell rare plants in Thailand.',
  metadataBase: new URL('https://root.market'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

function NavbarSkeleton() {
  return <div className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-sm z-50" aria-hidden />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <Suspense fallback={<NavbarSkeleton />}>
            <Navbar />
          </Suspense>
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <Toaster />
          <ScrollToTop />
          <PwaUpdatePrompt />
          <TutorialModalWrapper />
        </Providers>
      </body>
    </html>
  );
}
