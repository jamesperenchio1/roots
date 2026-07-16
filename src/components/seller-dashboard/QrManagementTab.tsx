'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';

import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { generateQR } from '@/lib/promptpay';
import type { Listing } from '@/types';

interface QrManagementTabProps {
  listings: Listing[];
  t: TFunction;
}

export function QrManagementTab({ listings, t }: QrManagementTabProps) {
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        listings.map(async (l) => {
          const plantId = l.plant_id || l.id;
          try {
            const { fetchPlant } = await import('@/lib/api');
            const plant = await fetchPlant(plantId);
            if (plant?.qr_signature) map[plantId] = plant.qr_signature;
          } catch {
            // ignore
          }
        })
      );
      if (active) setSignatures(map);
    };
    load();
    return () => { active = false; };
  }, [listings]);

  const handleDownload = async (l: Listing) => {
    try {
      const plantId = l.plant_id || l.id;
      const signature = signatures[plantId] || '';
      const url = `${window.location.origin}/p/${plantId}${signature ? `?s=${signature}` : ''}`;
      const qrUrl = await generateQR(url, 512);
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `root-qr-${plantId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('dashboard:seller.qrDownloaded'));
    } catch {
      toast.error(t('common:errors.generic'));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">{t('dashboard:seller.qrManagement')}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((l) => {
          const plantId = l.plant_id || l.id;
          const signature = signatures[plantId] || '';
          return (
            <div key={l.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={l.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.species?.common_name_en || l.species?.common_name_th || l.species?.scientific_name || t('common:unknown')}</p>
                  <p className="text-xs text-zinc-500 truncate">{plantId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/p/${plantId}${signature ? `?s=${signature}` : ''}`} className="flex-1 text-center px-3 py-2 rounded-lg border border-white/10 text-xs hover:bg-white/5">{t('common:actions.view')}</Link>
                <button onClick={() => handleDownload(l)} className="flex-1 text-center px-3 py-2 rounded-lg bg-emerald-500 text-black text-xs font-medium hover:bg-emerald-600">{t('common:actions.download')}</button>
              </div>
            </div>
          );
        })}
        {listings.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center col-span-full">{t('dashboard:seller.noListings')}</p>}
      </div>
    </div>
  );
}
