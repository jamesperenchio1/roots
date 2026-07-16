import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle, Tag, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import SpeciesAutocomplete from '@/components/SpeciesAutocomplete';
import type { SpeciesEntry } from '@/data/speciesDatabase';
import { ALL_SPECIES } from '@/data/speciesDatabase';
import { useListing } from '@/hooks/queries/useListings';
import { useSpeciesPriceStats } from '@/hooks/queries/useSpeciesPriceStats';
import { useAuth } from '@/hooks/useAuth';
import { updateListing, uploadListingPhoto } from '@/lib/api';
import { validateImageFile, sanitizeText, isValidPrice } from '@/lib/validation';
import { ProvinceCombobox } from '@/components/ProvinceCombobox';
import { UnsavedChangesBlocker } from '@/components/UnsavedChangesBlocker';
import type { Listing, Category } from '@/types';

interface ExistingPhoto {
  type: 'existing';
  id: string;
  url: string;
}

interface NewPhoto {
  type: 'new';
  file: File;
  preview: string;
}

type PhotoItem = ExistingPhoto | NewPhoto;

const SIZES = ['S', 'M', 'L', 'XL'] as const;

function findSpeciesEntry(listing: Listing): SpeciesEntry | null {
  if (!listing.species) return null;
  const byId = ALL_SPECIES.find((s) => s.id === listing.species!.id);
  if (byId) return byId;
  const bySci = ALL_SPECIES.find(
    (s) => s.scientific_name.toLowerCase() === listing.species!.scientific_name.toLowerCase()
  );
  if (bySci) return bySci;
  const byCommon = ALL_SPECIES.find(
    (s) => s.common_name_en.toLowerCase() === (listing.species!.common_name_en || '').toLowerCase()
  );
  return byCommon || null;
}

export default function EditListingPage() {
  const { t } = useTranslation(['marketplace', 'common']);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: listing, isPending: listingLoading } = useListing(id);

  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [species, setSpecies] = useState<SpeciesEntry | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [potSize, setPotSize] = useState('');
  const [description, setDescription] = useState('');
  const [delivery, setDelivery] = useState<string[]>([]);
  const [shippingCost, setShippingCost] = useState('');
  const [province, setProvince] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load listing and pre-populate fields
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setPageLoading(false);
      return;
    }
    if (listingLoading) return;
    if (!listing || !user || listing.seller_id !== user.id) {
      setNotFound(true);
      setPageLoading(false);
      return;
    }

    const matchedSpecies = findSpeciesEntry(listing);
    setSpecies(matchedSpecies);
    setSpeciesQuery(
      matchedSpecies
        ? matchedSpecies.scientific_name
        : listing.species?.scientific_name || listing.species?.common_name_en || ''
    );
    setPrice(String(listing.price_thb));
    setSize(listing.size_category);
    setPotSize(listing.pot_size_cm ? String(listing.pot_size_cm) : '');
    setDescription(listing.description);
    setDelivery(listing.delivery_options);
    setShippingCost(listing.shipping_cost_thb ? String(listing.shipping_cost_thb) : '');
    setProvince(listing.pickup_province || '');
    setTags(listing.tags || []);
    setPhotos(
      (listing.photos || []).map((p) => ({
        type: 'existing',
        id: p.id,
        url: p.storage_path,
      }))
    );
    setPageLoading(false);
  }, [id, user, listing, listingLoading]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: NewPhoto[] = [];
    for (const file of Array.from(files).slice(0, 10 - photos.length)) {
      const validation = validateImageFile(file, 5);
      if (!validation.ok) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      next.push({ type: 'new', file, preview: URL.createObjectURL(file) });
    }
    setPhotos((prev) => [...prev, ...next].slice(0, 10));
    setIsDirty(true);
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setIsDirty(true);
  };

  const handleSpeciesChange = (query: string, selected?: SpeciesEntry) => {
    setSpeciesQuery(query);
    if (selected) setSpecies(selected);
    setIsDirty(true);
  };

  const toggleDelivery = (opt: string) => {
    setDelivery((prev) => (prev.includes(opt) ? prev.filter((d) => d !== opt) : [...prev, opt]));
    setIsDirty(true);
  };

  const updateField =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setIsDirty(true);
    };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!speciesQuery) e.species = t('marketplace:create.errors.species');
    if (!price || !isValidPrice(parseInt(price))) e.price = t('marketplace:create.errors.price');
    if (!size) e.size = t('marketplace:create.errors.size');
    if (!description || description.length < 20) e.description = t('marketplace:create.errors.description');
    if (delivery.length === 0) e.delivery = t('marketplace:create.errors.delivery');
    if (delivery.includes('pickup') && !province) e.province = t('marketplace:create.errors.province');
    if (photos.length < 1) e.photos = t('marketplace:create.errors.photos');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!id || !user) return;

    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      for (const p of photos) {
        if (p.type === 'existing') {
          photoUrls.push(p.url);
        } else {
          photoUrls.push(await uploadListingPhoto(p.file, user.id));
        }
      }

      await updateListing(id, {
        species_id: species?.id,
        species_scientific: species?.scientific_name || speciesQuery,
        species_common_en: species?.common_name_en || speciesQuery,
        species_common_th: species?.common_name_th,
        category: (species?.category as Category) || 'other',
        price_thb: parseInt(price),
        size_category: size,
        pot_size_cm: potSize ? parseInt(potSize) : undefined,
        description: sanitizeText(description, 2000),
        delivery_options: delivery,
        pickup_province: province || undefined,
        shipping_cost_thb: shippingCost ? parseInt(shippingCost) : undefined,
        photos: photoUrls,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success(t('marketplace:edit.changesSaved'));
      setIsDirty(false);
      navigate('/seller-dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('marketplace:edit.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const marketStats = useSpeciesPriceStats(species?.id, 30);
  const pricePosition =
    marketStats && price ? ((parseInt(price) - marketStats.median) / marketStats.median) * 100 : 0;

  const photoCount = photos.length;
  const currency = t('common:currency');

  if (pageLoading) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6 flex justify-center">
        <div className="animate-pulse text-zinc-500 text-sm">{t('common:actions.loading')}</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-light tracking-tight mb-2">{t('marketplace:create.notFoundTitle')}</h1>
          <p className="text-sm text-zinc-500 mb-6">
            {t('marketplace:create.notFoundDescription')}
          </p>
          <Link
            to="/seller-dashboard"
            className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t('common:nav.sellerDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/seller-dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common:nav.sellerDashboard')}
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light tracking-tight">{t('marketplace:create.editTitle')}</h1>
            <p className="text-sm text-zinc-500">{t('marketplace:create.editSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('marketplace:create.photosLabel')}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="grid grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <div
                  key={p.type === 'existing' ? p.id : `new-${i}`}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-500/50 group"
                >
                  <img
                    src={p.type === 'existing' ? p.url : p.preview}
                    alt={t('marketplace:create.photoAlt', { index: i + 1 })}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('common:actions.remove')}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-emerald-400 py-0.5">
                      {t('marketplace:create.mainPhoto')}
                    </span>
                  )}
                </div>
              ))}
              {photos.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <Camera className="w-5 h-5 text-zinc-600" />
                  <span className="text-[10px] text-zinc-600">{t('marketplace:create.addPhoto')}</span>
                </button>
              )}
            </div>
            {photoCount > 0 && (
              <p className="text-xs text-emerald-400/80 mt-1 inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {t('marketplace:create.photosReady', { count: photoCount })}
              </p>
            )}
            {errors.photos && <p className="text-xs text-red-400 mt-1">{errors.photos}</p>}
          </div>

          {/* Species Autocomplete */}
          <div>
            <SpeciesAutocomplete
              value={speciesQuery}
              onChange={handleSpeciesChange}
              label={t('marketplace:create.speciesLabel')}
              placeholder={t('marketplace:create.speciesPlaceholder')}
            />
            {species && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full capitalize">
                  {species.category}
                </span>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {t('marketplace:create.careLabel')}: {species.care_level}
                </span>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {species.common_name_th}
                </span>
              </div>
            )}
            {errors.species && <p className="text-xs text-red-400 mt-1">{errors.species}</p>}
          </div>

          {/* Price with Market Context */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.priceLabel')}</label>
              <input
                type="number"
                value={price}
                onChange={updateField(setPrice)}
                placeholder={t('marketplace:create.pricePlaceholder')}
                min="10"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              />
              {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.sizeLabel')}</label>
              <select
                value={size}
                onChange={updateField(setSize)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">{t('marketplace:create.selectSize')}</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {t(`marketplace:create.sizeLabels.${s}`)}
                  </option>
                ))}
              </select>
              {errors.size && <p className="text-xs text-red-400 mt-1">{errors.size}</p>}
            </div>
          </div>

          {/* Price Position Indicator */}
          {marketStats && price && parseInt(price) > 0 && (
            <div
              className={`rounded-lg p-3 text-sm ${
                Math.abs(pricePosition) < 20
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : pricePosition > 50
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>
                  {Math.abs(pricePosition) < 20
                    ? t('marketplace:create.pricePosition.similar', { percent: Math.abs(pricePosition).toFixed(0), median: marketStats.median.toLocaleString(), currency })
                    : pricePosition > 50
                      ? t('marketplace:create.pricePosition.above', { percent: Math.abs(pricePosition).toFixed(0), median: marketStats.median.toLocaleString(), currency })
                      : t('marketplace:create.pricePosition.below', { percent: Math.abs(pricePosition).toFixed(0), median: marketStats.median.toLocaleString(), currency })}
                </span>
              </div>
              {Math.abs(pricePosition) > 50 && (
                <p className="text-xs mt-1 text-amber-400">
                  {t('marketplace:create.pricePosition.warning')}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.potSizeLabel')}</label>
              <input
                type="number"
                value={potSize}
                onChange={updateField(setPotSize)}
                placeholder={t('marketplace:create.potSizePlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.provinceLabel')}</label>
              <ProvinceCombobox
                value={province}
                onChange={setProvince}
                placeholder={t('marketplace:create.selectProvince')}
              />
              {errors.province && <p className="text-xs text-red-400 mt-1">{errors.province}</p>}
            </div>
          </div>

          {/* Delivery Options */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('marketplace:create.deliveryLabel')}</label>
            <div className="flex gap-3">
              {['ship', 'pickup'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleDelivery(opt)}
                  className={`flex-1 py-3 rounded-lg border text-sm capitalize transition-colors ${
                    delivery.includes(opt)
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {opt === 'ship' ? t('marketplace:listing.shipping') : t('marketplace:listing.pickup')}
                </button>
              ))}
            </div>
            {errors.delivery && <p className="text-xs text-red-400 mt-1">{errors.delivery}</p>}
          </div>

          {/* Shipping Cost */}
          {delivery.includes('ship') && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.shippingCostLabel')}</label>
              <input
                type="number"
                min="0"
                max="5000"
                value={shippingCost}
                onChange={updateField(setShippingCost)}
                placeholder={t('marketplace:create.shippingCostPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              <p className="text-xs text-zinc-500 mt-1">{t('marketplace:create.freeShippingNote')}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {t('marketplace:create.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={updateField(setDescription)}
              placeholder={t('marketplace:create.descriptionPlaceholder')}
              rows={5}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="flex justify-between mt-1">
              {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              <p
                className={`text-xs ml-auto ${
                  description.length < 20 ? 'text-zinc-600' : 'text-emerald-400'
                }`}
              >
                {t('marketplace:create.chars', { count: description.length })}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('marketplace:create.tagsLabel')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['variegated', 'rare', 'mature', 'seedling', 'cutting', 'rooted', 'flowering', 'fragrant', 'pet-friendly', 'beginner-friendly'].map(tTag => (
                <button
                  key={tTag}
                  type="button"
                  onClick={() => setTags(prev => prev.includes(tTag) ? prev.filter(x => x !== tTag) : [...prev, tTag])}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${tags.includes(tTag) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300'}`}
                >
                  {tTag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
                    if (v && !tags.includes(v) && tags.length < 10) { setTags([...tags, v]); setTagInput(''); }
                  }
                }}
                placeholder={t('marketplace:create.customTagPlaceholder')}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tTag => (
                  <span key={tTag} className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                    {tTag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== tTag))} className="text-zinc-500 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Fee Notice */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-zinc-400">
                  {t('marketplace:edit.feeNotice', {
                    net: price ? (parseInt(price) * 0.92).toFixed(0) : '0',
                    currency,
                    fee: price ? (parseInt(price) * 0.08).toFixed(0) : '0',
                  })}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {t('marketplace:edit.feeNote')}
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base"
          >
            {submitting ? t('common:actions.saving') : t('common:actions.save')}
          </Button>
        </form>
      </div>

      <UnsavedChangesBlocker isDirty={isDirty} />
    </div>
  );
}
