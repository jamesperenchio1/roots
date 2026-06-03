import { Link } from 'react-router-dom';
import { Leaf, Instagram, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-emerald-400" />
              <span className="text-lg font-semibold tracking-tight">ROOT</span>
            </Link>
            <p className="text-sm text-zinc-500 mb-4 max-w-xs leading-relaxed">
              Thailand's plant marketplace for every plant — from basil cuttings to
              variegated monsters. Permanent QR provenance. Transparent price history.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="text-zinc-500 hover:text-white transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors"><MessageCircle className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">Marketplace</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><Link to="/browse" className="hover:text-white transition-colors">Browse Plants</Link></li>
              <li><Link to="/market" className="hover:text-white transition-colors">Price Trends</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/fees" className="hover:text-white transition-colors">Fees</Link></li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">For Sellers</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><Link to="/seller-dashboard/listings/new" className="hover:text-white transition-colors">Sell a Plant</Link></li>
              <li><Link to="/seller-dashboard" className="hover:text-white transition-colors">Seller Dashboard</Link></li>
              <li><Link to="/seller-dashboard/payouts" className="hover:text-white transition-colors">Payouts</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">QR Provenance</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">Company</h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li><Link to="/about" className="hover:text-white transition-colors">About Root</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">2025 Root Plant Market Co., Ltd. Bangkok, Thailand.</p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link to="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-zinc-400 transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
