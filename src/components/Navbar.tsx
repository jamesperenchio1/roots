import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Search, Menu, X, Leaf, TrendingUp, User, LogOut, Shield, Store } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const isActive = (path: string) => location.pathname === path;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : '/browse');
    setSearchOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold tracking-tight">ROOT</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/browse" className={`transition-colors ${isActive('/browse') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              Browse
            </Link>
            <Link to="/market" className={`flex items-center gap-1 transition-colors ${isActive('/market') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              Market Data
            </Link>
            <Link to="/about" className={`transition-colors ${isActive('/about') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              About
            </Link>
            <Link to="/contact" className={`transition-colors ${isActive('/contact') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-zinc-400 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            {user && <NotificationBell userId={user.id} />}
            {user ? (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/seller-dashboard" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
                  <Store className="w-4 h-4" />
                  Sell
                </Link>
                <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
                  <User className="w-4 h-4" />
                  {user.display_name}
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <button onClick={logout} className="p-1.5 text-zinc-500 hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
                  Log In
                </Link>
                <Link to="/signup" className="text-sm bg-white text-black px-4 py-1.5 rounded-full hover:bg-zinc-200 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={submitSearch} className="pb-4 border-t border-white/10 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plants, species, sellers..."
                className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
            </div>
          </form>
        )}
      </div>

      {menuOpen && (
        <div className="md:hidden bg-zinc-900 border-t border-white/10 px-4 py-4 space-y-3">
          <Link to="/browse" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Browse</Link>
          <Link to="/market" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Market Data</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">About</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Contact</Link>
          <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">How It Works</Link>
          <Link to="/fees" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Fees</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Dashboard</Link>
              <Link to="/seller-dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Seller Dashboard</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-amber-400">Admin</Link>}
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block py-2 text-red-400">Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">Log In</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="block py-2 text-emerald-400">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
