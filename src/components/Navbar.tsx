import { useState, useEffect, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Search, Menu, X, Leaf, TrendingUp, User, LogOut, Shield, Store, QrCode, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import RealtimeBanner from './RealtimeBanner';
import { subscribeConversations, getConversationsVersion, getUnreadMessageCount } from '@/lib/messaging';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useTranslation('common');
  const [menuOpen, setMenuOpen] = useState(false);
  useSyncExternalStore(subscribeConversations, getConversationsVersion);
  const unreadMessages = user ? getUnreadMessageCount(user.id) : 0;
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
    <>
    <RealtimeBanner />
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-semibold tracking-tight">ROOTS</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/browse" className={`transition-colors ${isActive('/browse') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              {t('nav.browse')}
            </Link>
            <Link to="/market" className={`flex items-center gap-1 transition-colors ${isActive('/market') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              {t('nav.market')}
            </Link>
            <Link to="/about" className={`transition-colors ${isActive('/about') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              {t('nav.about')}
            </Link>
            <Link to="/contact" className={`transition-colors ${isActive('/contact') ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              {t('nav.contact')}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/scan" className="p-2 text-zinc-400 hover:text-white transition-colors hidden sm:block" title={t('nav.scan')}>
              <QrCode className="w-5 h-5" />
            </Link>
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-zinc-400 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            {user && (
              <Link to="/messages" className="relative p-2 text-zinc-400 hover:text-white transition-colors" aria-label={t('nav.messages', 'Messages')}>
                <MessageSquare className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-[10px] font-bold text-black">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            )}
            {user && <NotificationBell userId={user.id} />}
            {user ? (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/seller-dashboard" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
                  <Store className="w-4 h-4" />
                  {t('nav.sell')}
                </Link>
                <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
                  <User className="w-4 h-4" />
                  {user.display_name}
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                    <Shield className="w-4 h-4" />
                    {t('nav.admin')}
                  </Link>
                )}
                <button onClick={logout} className="p-1.5 text-zinc-500 hover:text-white transition-colors" aria-label={t('nav.logout')}>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
                  {t('nav.login')}
                </Link>
                <Link to="/signup" className="text-sm bg-white text-black px-4 py-1.5 rounded-full hover:bg-zinc-200 transition-colors">
                  {t('nav.signup')}
                </Link>
              </div>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white" aria-label={menuOpen ? t('actions.close') : t('nav.menu')}>
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
                placeholder={t('nav.search')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
            </div>
          </form>
        )}
      </div>

      {menuOpen && (
        <div className="md:hidden bg-zinc-900 border-t border-white/10 px-4 py-4 space-y-3">
          <Link to="/browse" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.browse')}</Link>
          <Link to="/market" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.market')}</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.about')}</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.contact')}</Link>
          <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('home:sections.howItWorks')}</Link>
          <Link to="/fees" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('common:nav.fees')}</Link>
          {user ? (
            <>
              <Link to="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2 text-zinc-300 hover:text-white">
                {t('nav.messages', 'Messages')}
                {unreadMessages > 0 && (
                  <span className="bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
                )}
              </Link>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.dashboard')}</Link>
              <Link to="/seller-dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.sellerDashboard')}</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-amber-400">{t('nav.admin')}</Link>}
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block py-2 text-red-400">{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-zinc-300 hover:text-white">{t('nav.login')}</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="block py-2 text-emerald-400">{t('nav.signup')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
    </>
  );
}
