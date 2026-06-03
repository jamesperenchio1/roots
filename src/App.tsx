import { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { hydratePublicData } from '@/lib/api';
import { Leaf } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import ScrollToTop from '@/components/ScrollToTop';

const HomePage = lazy(() => import('@/pages/HomePage'));
const BrowsePage = lazy(() => import('@/pages/BrowsePage'));
const MarketPage = lazy(() => import('@/pages/MarketPage'));
const ListingPage = lazy(() => import('@/pages/ListingPage'));
const SpeciesPage = lazy(() => import('@/pages/SpeciesPage'));
const PlantQRPage = lazy(() => import('@/pages/PlantQRPage'));
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
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    // Preserve intended destination so we can redirect back after login
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-black text-white">
      <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
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
            <Route path="/species/:id" element={<SpeciesPage />} />
            <Route path="/p/:plantId" element={<PlantQRPage />} />
            <Route path="/seller/:id" element={<SellerPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/fees" element={<FeesPage />} />

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
    </div>
  );
}

function BootGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState(false);
  useEffect(() => {
    hydratePublicData()
      .catch(() => setBootError(true))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">Loading the market…</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Leaf className="w-8 h-8 text-amber-400" />
        <p className="text-sm text-zinc-400">Connection issue detected</p>
        <p className="text-xs text-zinc-600 max-w-xs">
          We are having trouble connecting to our servers. Some features may be limited. Try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
        {/* Still render app so offline seed data works */}
        {children}
      </div>
    );
  }

  return <>{children}</>;
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
