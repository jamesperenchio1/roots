'use client';

import Link from 'next/link';
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

const tabs = [
  { id: '', labelKey: 'overview', icon: Shield },
  { id: 'review', labelKey: 'review', icon: ScanSearch },
  { id: 'disputes', labelKey: 'disputes', icon: AlertTriangle },
  { id: 'users', labelKey: 'users', icon: UsersIcon },
  { id: 'transactions', labelKey: 'transactions', icon: DollarSign },
  { id: 'species', labelKey: 'species', icon: Leaf },
  { id: 'messages', labelKey: 'messages', icon: MessageSquare },
];

function AdminTab({ tab }: { tab: string }) {
  switch (tab) {
    case 'review':
      return <ListingsSection />;
    case 'disputes':
      return <DisputesSection />;
    case 'users':
      return <UsersSection />;
    case 'transactions':
      return <TransactionsSection />;
    case 'species':
      return <SpeciesSection />;
    case 'messages':
      return <MessagesSection />;
    case '':
    default:
      return <StatsCards />;
  }
}

export default function AdminPage({ slug = '' }: { slug?: string }) {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-light tracking-tight mb-6">{t('common:admin.title')}</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${slug === tab.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className="w-4 h-4" />
              {t(`common:admin.tabs.${tab.labelKey}`)}
            </Link>
          ))}
        </div>

        <AdminTab tab={slug} />
      </div>
    </div>
  );
}
