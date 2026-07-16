import type { TFunction } from 'i18next';
import type { Listing } from '@/types';

interface InventoryTabProps {
  listings: Listing[];
  t: TFunction;
}

export function InventoryTab({ listings, t }: InventoryTabProps) {
  return (
    <div>
      <h2 className="text-lg font-medium mb-4">{t('dashboard:seller.inventory')}</h2>
      <div className="space-y-3">
        {listings.map((l) => (
          <div key={l.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <img src={l.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-medium">{l.species?.common_name_en || t('common:unknown')}</p>
                <p className="text-xs text-zinc-500">{l.price_thb.toLocaleString()} {t('common:currency')}</p>
              </div>
            </div>
            <span className="text-xs text-zinc-400">{t('dashboard:seller.singleItem')}</span>
          </div>
        ))}
        {listings.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:seller.noListings')}</p>}
      </div>
    </div>
  );
}
