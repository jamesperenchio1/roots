'use client'


import Link from 'next/link';
import type { TFunction } from 'i18next';
import { Package, Plus, ScanSearch, Eye, Heart, QrCode } from 'lucide-react';
import { ALL_SPECIES } from '@/data/speciesDatabase';
import { getSpeciesPriceStatsFromData } from '@/lib/api';
import { usePublicData } from '@/hooks/queries/usePublicData';
import { ListingActions } from './ListingActions';
import type { Listing, Transaction } from '@/types';

interface ListingsTabProps {
  listings: Listing[];
  sales: Transaction[];
  onWithdraw: (id: string) => void;
  onMarkSold: (id: string) => void;
  onDuplicate: () => void;
  t: TFunction;
}

export function ListingsTab({ listings, sales, onWithdraw, onMarkSold, onDuplicate, t }: ListingsTabProps) {
  const { data: publicData } = usePublicData();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium">{t('dashboard:seller.activeListings')} ({listings.length})</h2>
          <p className="text-xs text-zinc-500">{t('dashboard:seller.manageListings')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/identify?returnTo=/seller-dashboard/listings/new" className="flex items-center gap-1.5 border border-white/10 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
            <ScanSearch className="w-4 h-4" /> {t('dashboard:seller.identify')}
          </Link>
          <Link href="/seller-dashboard/listings/new" className="flex items-center gap-1.5 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
            <Plus className="w-4 h-4" /> {t('dashboard:seller.newListing')}
          </Link>
        </div>
      </div>

      <div className="grid gap-3">
        {listings.map((l) => {
          const speciesData = ALL_SPECIES.find((s) => l.plant_id?.includes(s.id));
          const price30d = publicData
            ? getSpeciesPriceStatsFromData(publicData.priceSnapshots, publicData.listings, l.plant_id?.replace('p-', 'sp-') || '', 30)
            : null;
          const vsMarket = price30d ? ((l.price_thb - price30d.median) / price30d.median * 100).toFixed(0) : '0';
          const sale = sales.find((s) => s.listing_id === l.id);
          const soldTo = sale?.buyer?.display_name;
          return (
            <div key={l.id} className="group bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/15 hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-4">
                <Link href={`/listing/${l.id}`} className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                  <img src={l.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt={l.species?.scientific_name || t('marketplace:listingAlt')} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link href={`/listing/${l.id}`} className="font-medium truncate hover:text-emerald-400 transition-colors">{l.species?.common_name_en || speciesData?.common_name_en || t('common:unknownPlant')}</Link>
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 shrink-0">{t(`common:status.${l.status}`)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mb-2">{l.species?.scientific_name || speciesData?.scientific_name}</p>
                  {l.status === 'sold' && soldTo && (
                    <p className="text-xs text-emerald-400 mb-2">{t('dashboard:seller.soldTo', { name: soldTo })}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span className="text-emerald-400 font-semibold">{l.price_thb.toLocaleString()} {t('common:currency')}</span>
                    <span>{l.size_category}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.view_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {l.watch_count || 0}</span>
                    <span>{l.delivery_options?.join(' + ')}</span>
                    <span className={parseFloat(vsMarket) > 20 ? 'text-amber-400' : parseFloat(vsMarket) < -20 ? 'text-emerald-400' : 'text-zinc-500'}>{parseFloat(vsMarket) > 0 ? '+' : ''}{vsMarket}%</span>
                    {l.has_qr_provenance !== false && l.plant_id && (
                      <span className="inline-flex items-center gap-1 text-emerald-400" title={t('marketplace:provenance.qrTagBadge')}>
                        <QrCode className="w-3 h-3" /> {t('marketplace:provenance.qrTagBadge')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <ListingActions listing={l} onWithdraw={onWithdraw} onMarkSold={onMarkSold} onDuplicate={onDuplicate} t={t} />
                </div>
              </div>
            </div>
          );
        })}
        {listings.length === 0 && (
          <div className="text-center py-12 bg-zinc-900/20 rounded-xl">
            <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 mb-1">{t('dashboard:seller.noListings')}</p>
            <p className="text-zinc-600 text-sm mb-4">{t('dashboard:seller.createFirst')}</p>
            <Link href="/seller-dashboard/listings/new" className="text-emerald-400 text-sm hover:underline">{t('dashboard:seller.newListing')}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
