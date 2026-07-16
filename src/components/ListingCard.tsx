'use client'


import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { PLANT_IMAGES } from '@/data/mockData';
import { LazyImage } from '@/components/LazyImage';
import { Sparkline } from '@/components/Sparkline';
import { getProvinceLabel } from '@/lib/provinces';
import { getSrcSet, CARD_SIZES, RESPONSIVE_WIDTHS } from '@/lib/images';
import type { Listing } from '@/types';

export type ListingCardLayout = 'minimal' | 'browse' | 'market' | 'species' | 'seller';

export interface ListingCardProps {
  listing: Listing;
  layout?: ListingCardLayout;
  aspectRatio?: '3/4' | '4/3';
  sizes?: string;
  priority?: boolean;
  showScientificName?: boolean;
  showCommonName?: boolean;
  showDescription?: boolean;
  showSeller?: boolean;
  showProvince?: boolean;
  showDeliveryOptions?: boolean;
  showSizePill?: boolean;
  showSparkline?: boolean;
  sparklineData?: number[];
  topSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
  className?: string;
}

function listingImageSrc(listing: Listing): string {
  return (
    listing.photos?.[0]?.storage_path ||
    PLANT_IMAGES[listing.plant_id?.replace('p-', 'sp-') || listing.species?.id || ''] ||
    '/images/plants/monstera-thai.jpg'
  );
}

const LAYOUT_CONFIG: Record<
  ListingCardLayout,
  Pick<
    ListingCardProps,
    | 'aspectRatio'
    | 'showScientificName'
    | 'showCommonName'
    | 'showDescription'
    | 'showSeller'
    | 'showProvince'
    | 'showDeliveryOptions'
    | 'showSizePill'
    | 'showSparkline'
  > & { wrapper: string; imageWrapper?: string }
> = {
  minimal: {
    aspectRatio: '3/4',
    showScientificName: false,
    showCommonName: true,
    showDescription: false,
    showSeller: false,
    showProvince: false,
    showDeliveryOptions: false,
    showSizePill: false,
    showSparkline: false,
    wrapper:
      'group block break-inside-avoid bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300 hover:-translate-y-1',
  },
  browse: {
    aspectRatio: '3/4',
    showScientificName: true,
    showCommonName: true,
    showDescription: false,
    showSeller: true,
    showProvince: false,
    showDeliveryOptions: true,
    showSizePill: true,
    showSparkline: true,
    wrapper:
      'group block break-inside-avoid bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300',
  },
  market: {
    aspectRatio: '4/3',
    showScientificName: false,
    showCommonName: false,
    showDescription: true,
    showSeller: true,
    showProvince: true,
    showDeliveryOptions: false,
    showSizePill: true,
    showSparkline: false,
    wrapper:
      'group block bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all',
    imageWrapper: 'aspect-[4/3] rounded-lg overflow-hidden bg-zinc-800 mb-3',
  },
  species: {
    aspectRatio: '4/3',
    showScientificName: false,
    showCommonName: false,
    showDescription: true,
    showSeller: true,
    showProvince: true,
    showDeliveryOptions: false,
    showSizePill: true,
    showSparkline: true,
    wrapper:
      'group block bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all',
    imageWrapper: 'aspect-[4/3] rounded-lg overflow-hidden bg-zinc-800 mb-3',
  },
  seller: {
    aspectRatio: '3/4',
    showScientificName: true,
    showCommonName: true,
    showDescription: false,
    showSeller: false,
    showProvince: false,
    showDeliveryOptions: false,
    showSizePill: false,
    showSparkline: false,
    wrapper:
      'group block bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300',
  },
};

export function ListingCard({
  listing,
  layout = 'minimal',
  aspectRatio: aspectRatioProp,
  sizes = CARD_SIZES,
  priority,
  showScientificName: showScientificNameProp,
  showCommonName: showCommonNameProp,
  showDescription: showDescriptionProp,
  showSeller: showSellerProp,
  showProvince: showProvinceProp,
  showDeliveryOptions: showDeliveryOptionsProp,
  showSizePill: showSizePillProp,
  showSparkline: showSparklineProp,
  sparklineData,
  topSlot,
  bottomSlot,
  className,
}: ListingCardProps) {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const config = LAYOUT_CONFIG[layout];

  const aspectRatio = aspectRatioProp ?? config.aspectRatio;
  const showScientificName = showScientificNameProp ?? config.showScientificName;
  const showCommonName = showCommonNameProp ?? config.showCommonName;
  const showDescription = showDescriptionProp ?? config.showDescription;
  const showSeller = showSellerProp ?? config.showSeller;
  const showProvince = showProvinceProp ?? config.showProvince;
  const showDeliveryOptions = showDeliveryOptionsProp ?? config.showDeliveryOptions;
  const showSizePill = showSizePillProp ?? config.showSizePill;
  const showSparkline = showSparklineProp ?? config.showSparkline;

  const src = listingImageSrc(listing);
  const srcSet = getSrcSet(listing.photos?.[0]?.storage_path, { widths: RESPONSIVE_WIDTHS, resize: 'cover' });
  const alt = listing.species?.scientific_name || t('marketplace:listingAlt');
  const commonName = listing.species?.common_name_en || listing.species?.common_name_th;

  const image = config.imageWrapper ? (
    <div className={config.imageWrapper}>
      <LazyImage
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        aspectRatio={aspectRatio}
        priority={priority}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      />
    </div>
  ) : (
    <LazyImage
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      aspectRatio={aspectRatio}
      priority={priority}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
    />
  );

  const sizeClasses = showSizePill
    ? 'text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded'
    : 'text-xs text-zinc-600';

  return (
    <Link href={`/listing/${listing.id}`} className={`${config.wrapper} ${className ?? ''}`.trim()}>
      {image}
      <div className="p-4">
        {topSlot && <div className="mb-2">{topSlot}</div>}

        {showScientificName && (
          <p className="text-xs text-zinc-500 mb-0.5 truncate">{listing.species?.scientific_name}</p>
        )}
        {showCommonName && commonName && (
          <p className={`font-medium truncate ${showScientificName ? 'text-sm' : 'text-white'}`}>{commonName}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-emerald-400 font-semibold text-sm">
            {listing.price_thb.toLocaleString()} {t('common:currency')}
          </span>
          <span className={sizeClasses}>{listing.size_category}</span>
        </div>

        {showDescription && listing.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 mt-2 mb-2">{listing.description}</p>
        )}

        {(showSeller || showProvince) && (
          <div className="flex items-center justify-between text-xs text-zinc-600 mt-2">
            {showSeller && <span>{listing.seller?.display_name}</span>}
            {showProvince && <span>{getProvinceLabel(listing.pickup_province, i18n.language)}</span>}
          </div>
        )}

        {showDeliveryOptions && (
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-600">
            {listing.delivery_options?.includes('ship') && <span>{t('marketplace:listing.shipping')}</span>}
            {listing.delivery_options?.includes('pickup') && <span>{t('marketplace:listing.pickup')}</span>}
            {listing.pickup_province && <span>{getProvinceLabel(listing.pickup_province, i18n.language)}</span>}
          </div>
        )}

        {showSparkline && sparklineData && (
          <div className="mt-3">
            <Sparkline data={sparklineData} width={layout === 'browse' ? 50 : 200} height={layout === 'browse' ? 16 : 30} color="#4ade80" />
          </div>
        )}

        {bottomSlot && <div className="mt-2">{bottomSlot}</div>}
      </div>
    </Link>
  );
}
