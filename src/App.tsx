import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { hydratePublicData } from '@/lib/api';
import { Leaf } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import BrowsePage from '@/pages/BrowsePage';
import MarketPage from '@/pages/MarketPage';
import ListingPage from '@/pages/ListingPage';
import SpeciesPage from '@/pages/SpeciesPage';
import PlantQRPage from '@/pages/PlantQRPage';
import SellerPage from '@/pages/SellerPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import SellerDashboardPage from '@/pages/SellerDashboardPage';
import AdminPage from '@/pages/AdminPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderPage from '@/pages/OrderPage';
import DisputePage from '@/pages/DisputePage';
import CreateListingPage from '@/pages/CreateListingPage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import FeesPage from '@/pages/FeesPage';
import AboutPage from '@/pages/AboutPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import ContactPage from '@/pages/ContactPage';
import NotFoundPage from '@/pages/NotFoundPage';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="min-h-[60vh]">
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

          {/* Authenticated User Pages */}
          <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
          <Route path="/dashboard/:tab" element={<AuthGuard><DashboardPage /></AuthGuard>} />

          {/* Seller Pages — order matters: most specific first */}
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
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

function BootGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hydratePublicData().finally(() => setReady(true));
  }, []);
  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
        <p className="text-sm text-zinc-500">Loading the market…</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BootGate>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BootGate>
  );
}
