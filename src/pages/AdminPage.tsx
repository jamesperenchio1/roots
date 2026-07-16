import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Users as UsersIcon, DollarSign, Leaf, MessageSquare, ScanSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  StatsCards,
  DisputesSection,
  UsersSection,
  TransactionsSection,
  SpeciesSection,
  MessagesSection,
  ListingsSection,
} from '@/components/admin';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation(['common']);
  const location = useLocation();
  const tabs = [
    { id: '', labelKey: 'overview', icon: Shield },
    { id: 'review', labelKey: 'review', icon: ScanSearch },
    { id: 'disputes', labelKey: 'disputes', icon: AlertTriangle },
    { id: 'users', labelKey: 'users', icon: UsersIcon },
    { id: 'transactions', labelKey: 'transactions', icon: DollarSign },
    { id: 'species', labelKey: 'species', icon: Leaf },
    { id: 'messages', labelKey: 'messages', icon: MessageSquare },
  ];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-light tracking-tight mb-6">{t('common:admin.title')}</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={`/admin/${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${location.pathname === `/admin/${tab.id}` ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className="w-4 h-4" />
              {t(`common:admin.tabs.${tab.labelKey}`)}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<StatsCards />} />
        <Route path="review" element={<ListingsSection />} />
        <Route path="disputes" element={<DisputesSection />} />
        <Route path="users" element={<UsersSection />} />
        <Route path="transactions" element={<TransactionsSection />} />
        <Route path="species" element={<SpeciesSection />} />
        <Route path="messages" element={<MessagesSection />} />
      </Routes>
    </AdminLayout>
  );
}
