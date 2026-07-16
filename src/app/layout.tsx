import type { Metadata } from 'next';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <Suspense fallback={null}>
            <main className="min-h-[60vh]">{children}</main>
          </Suspense>
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
