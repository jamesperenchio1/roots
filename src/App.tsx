import { useEffect, useState, Suspense, lazy, createContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { hydratePublicData } from '@/lib/api';
import { Leaf } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import ScrollToTop from '@/components/ScrollToTop';
import AuthGuard from '@/components/AuthGuard';
import AdminGuard from '@/components/AdminGuard';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';
import TutorialModal from '@/components/TutorialModal';

const HomePage = lazy(() => import('@/pages/HomePage'));
const BrowsePage = lazy(() => import('@/pages/BrowsePage'));
const MarketPage = lazy(() => import('@/pages/MarketPage'));
const ListingPage = lazy(() => import('@/pages/ListingPage'));
const SpeciesPage = lazy(() => import('@/pages/SpeciesPage'));
const PlantQRPage = lazy(() => import('@/pages/PlantQRPage'));
const ProvenancePage = lazy(() => import('@/pages/ProvenancePage'));
const SellerPage = lazy(() => import('@/pages/SellerPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const SignupPage = lazy(() => import('@/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SellerDashboardPage = lazy(() => import('@/pages/SellerDashboardPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderPage = lazy(() => import('@/pages/OrderPage'));
const DisputePage = lazy(() => import('@/pages/DisputePage'));
const CreateListingPage = lazy(() => import('@/pages/CreateListingPage'));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage'));
const FeesPage = lazy(() => import('@/pages/FeesPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const ShippingGuidePage = lazy(() => import('@/pages/ShippingGuidePage'));
const EditListingPage = lazy(() => import('@/pages/EditListingPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const QRScannerPage = lazy(() => import('@/pages/QRScannerPage'));
const IdentifyPage = lazy(() => import('@/pages/IdentifyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-black text-white">
      <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

function TutorialModalWrapper() {
  const { showTutorial, closeTutorial, skipTour, completeTour, dontShowAgain } = useOnboarding();
  return (
    <TutorialModal
      open={showTutorial}
      onOpenChange={closeTutorial}
      onSkip={skipTour}
      onComplete={completeTour}
      onDontShowAgain={dontShowAgain}
    />
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="min-h-[60vh]">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/browse/:category" element={<BrowsePage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/listing/:id" element={<ListingPage />} />
            <Route path="/listing/:id/edit" element={<AuthGuard><EditListingPage /></AuthGuard>} />
            <Route path="/species/:id" element={<SpeciesPage />} />
            <Route path="/p/:plantId" element={<PlantQRPage />} />
            <Route path="/seller/:id" element={<SellerPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/provenance" element={<ProvenancePage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/shipping-guide" element={<ShippingGuidePage />} />
            <Route path="/scan" element={<QRScannerPage />} />
            <Route path="/identify" element={<IdentifyPage />} />

            {/* Auth Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Authenticated User Pages */}
            <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
            <Route path="/dashboard/:tab" element={<AuthGuard><DashboardPage /></AuthGuard>} />

            {/* Seller Pages */}
            <Route path="/seller-dashboard/listings/new" element={<AuthGuard><CreateListingPage /></AuthGuard>} />
            <Route path="/seller-dashboard/:tab" element={<AuthGuard><SellerDashboardPage /></AuthGuard>} />
            <Route path="/seller-dashboard" element={<AuthGuard><SellerDashboardPage /></AuthGuard>} />

            {/* Messages */}
            <Route path="/messages" element={<AuthGuard><MessagesPage /></AuthGuard>} />
            <Route path="/messages/:threadId" element={<AuthGuard><MessagesPage /></AuthGuard>} />

            {/* Transaction Flows */}
            <Route path="/checkout/:listingId" element={<AuthGuard><CheckoutPage /></AuthGuard>} />
            <Route path="/order/:transactionId" element={<AuthGuard><OrderPage /></AuthGuard>} />
            <Route path="/order/:transactionId/dispute" element={<AuthGuard><DisputePage /></AuthGuard>} />

            {/* Admin */}
            <Route path="/admin/*" element={<AdminGuard><AdminPage /></AdminGuard>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <Toaster />
      <ScrollToTop />
      <PwaUpdatePrompt />
      <TutorialModalWrapper />
    </div>
  );
}

export const BootErrorContext = createContext(false);

function BootGate({ children }: { children: React.ReactNode }) {
  const [bootError, setBootError] = useState(false);
  useEffect(() => {
    let mounted = true;
    hydratePublicData().catch(() => {
      if (mounted) setBootError(true);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <BootErrorContext.Provider value={bootError}>
      {children}
    </BootErrorContext.Provider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BootGate>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BootGate>
    </ErrorBoundary>
  );
}
