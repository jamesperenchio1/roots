import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, QrCode, CheckCircle, Info, X, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import SpeciesAutocomplete from '@/components/SpeciesAutocomplete';
import type { SpeciesEntry } from '@/data/speciesDatabase';
import { getSpeciesPriceStats } from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { createListing, uploadListingPhoto, fetchPlant } from '@/lib/api';
import { generateQR } from '@/lib/promptpay';
import { validateImageFile, sanitizeText, isValidPrice } from '@/lib/validation';
import { getProvinceOptions } from '@/lib/provinces';
import type { Listing, Category } from '@/types';

interface PhotoItem { file: File; preview: string; }

const SIZES = ['S', 'M', 'L', 'XL'] as const;

// Broad tag vocabulary used for autocomplete. Sellers can still type anything
// not in here and add it as a custom tag.
const TAG_VOCAB = [
  'variegated', 'rare', 'mature', 'seedling', 'cutting', 'rooted', 'unrooted',
  'flowering', 'fragrant', 'pet-friendly', 'beginner-friendly', 'low-light',
  'air-purifying', 'fast-growing', 'drought-tolerant', 'humidity-loving',
  'trailing', 'climbing', 'compact', 'large', 'indoor', 'outdoor', 'aroid',
  'hoya', 'succulent', 'cactus', 'fern', 'orchid', 'herb', 'vegetable',
  'fruit', 'bonsai', 'carnivorous', 'aquatic', 'variegata', 'albo', 'mint',
  'collector', 'imported', 'local', 'cold-hardy', 'shade', 'full-sun',
];

export default function CreateListingPage() {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const provinceOptions = useMemo(() => getProvinceOptions(i18n.language), [i18n.language]);
  const [step, setStep] = useState<'form' | 'qr'>('form');
  const [species, setSpecies] = useState<SpeciesEntry | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [potSize, setPotSize] = useState('');
  const [description, setDescription] = useState('');
  const [delivery, setDelivery] = useState<string[]>([]);
  const [shippingCost, setShippingCost] = useState('');
  const [province, setProvince] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const tagSuggestions = (() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return [];
    return TAG_VOCAB.filter(tTag => tTag.includes(q) && !tags.includes(tTag)).slice(0, 6);
  })();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Listing | null>(null);
  const [provenanceQR, setProvenanceQR] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isLocalAdmin } = useAuth();
  const navigate = useNavigate();
  const photoCount = photos.length;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: PhotoItem[] = [];
    for (const file of Array.from(files).slice(0, 10 - photos.length)) {
      const validation = validateImageFile(file, 5);
      if (!validation.ok) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotos(prev => [...prev, ...next].slice(0, 10));
  };

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
  };

  const marketStats = species && price
    ? getSpeciesPriceStats(species.id, 30)
    : null;
  const pricePosition = marketStats && price
    ? ((parseInt(price) - marketStats.median) / marketStats.median * 100)
    : 0;

  const handleSpeciesChange = (query: string, selected?: SpeciesEntry) => {
    setSpeciesQuery(query);
    if (selected) setSpecies(selected);
  };

  const toggleDelivery = (opt: string) => {
    setDelivery(prev => prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt]);
  };

  const captureLocation = () => {
    if (!('geolocation' in navigator)) { setGeoStatus('error'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
        });
        setGeoStatus('idle');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!speciesQuery) e.species = t('marketplace:create.errors.species');
    if (!price || !isValidPrice(parseInt(price))) e.price = t('marketplace:create.errors.price');
    if (!size) e.size = t('marketplace:create.errors.size');
    if (!description || description.length < 20) e.description = t('marketplace:create.errors.description');
    if (delivery.length === 0) e.delivery = t('marketplace:create.errors.delivery');
    if (delivery.includes('pickup') && !province) e.province = t('marketplace:create.errors.province');
    if (photoCount < 1) e.photos = t('marketplace:create.errors.photos');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user || isLocalAdmin) {
      toast.error(t('marketplace:create.signUpSeller'));
      navigate('/signup');
      return;
    }
    setSubmitting(true);
    try {
      const urls: string[] = [];
      for (const p of photos) {
        urls.push(await uploadListingPhoto(p.file, user.id));
      }
      const listing = await createListing({
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
        shipping_cost_thb: delivery.includes('ship') ? (shippingCost ? parseInt(shippingCost) : 0) : undefined,
        pickup_province: province || undefined,
        pickup_location: delivery.includes('pickup') ? (pickupLocation.trim() || undefined) : undefined,
        pickup_lat: delivery.includes('pickup') ? pickupCoords?.lat : undefined,
        pickup_lng: delivery.includes('pickup') ? pickupCoords?.lng : undefined,
        photos: urls,
        tags: tags.length > 0 ? tags : undefined,
      }, user);
      const plant = await fetchPlant(listing.plant_id);
      const signature = plant?.qr_signature || '';
      const qrUrl = `${window.location.origin}/#/p/${listing.plant_id}${signature ? `?s=${signature}` : ''}`;
      const qr = await generateQR(qrUrl, 220);
      setCreated(listing);
      setProvenanceQR(qr);
      setStep('qr');
      toast.success(t('marketplace:create.published'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('marketplace:create.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const currency = t('common:currency');

  if (step === 'qr') {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light mb-2">{t('marketplace:create.successTitle')}</h1>
          <p className="text-zinc-500 mb-2">
            {t('marketplace:create.successSubtitle', { name: species?.common_name_en || speciesQuery })}
          </p>
          <p className="text-sm text-zinc-600 mb-6">
            {t('marketplace:create.successDescription')}
          </p>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2 justify-center">
              <QrCode className="w-4 h-4 text-purple-400" />
              {t('marketplace:create.provenanceQrTitle')}
            </h3>
            <div className="w-48 h-48 bg-white rounded-xl mx-auto mb-3 p-3 flex items-center justify-center">
              {provenanceQR
                ? <img src={provenanceQR} alt={t('marketplace:create.provenanceQrAlt')} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                : <QrCode className="w-28 h-28 text-zinc-900" />}
            </div>
            <p className="text-xs text-emerald-400 mb-2">
              {t('marketplace:create.autoDownloaded')}
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              {t('marketplace:create.printInstructions')}
            </p>
            <div className="flex gap-2 justify-center">
              <a
                href={provenanceQR || '#'}
                download={`root-provenance-${created?.id || 'qr'}.png`}
                className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-black text-sm px-4 py-2 rounded-md font-medium"
              >
                {t('common:actions.download')}
              </a>
              <Button type="button" variant="outline" className="border-white/10 text-sm" onClick={() => window.print()}>{t('common:actions.print')}</Button>
            </div>
          </div>

          {/* Print-only QR tag template */}
          <div className="hidden print:block">
            <div className="text-center py-10">
              <h1 className="text-2xl font-bold mb-2">{t('marketplace:create.provenanceTagTitle')}</h1>
              <p className="text-sm mb-6">{species?.common_name_en || speciesQuery}</p>
              <div className="w-64 h-64 bg-white rounded-xl mx-auto p-4 mb-4">
                <img src={provenanceQR} alt={t('marketplace:create.provenanceQrAlt')} loading="lazy" decoding="async" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-zinc-500">{t('marketplace:create.scanInstruction')}</p>
              <p className="text-xs text-zinc-500 mt-1">{window.location.origin}/#/p/{created?.id}</p>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-left mb-6">
            <h4 className="text-sm font-medium mb-2">{t('marketplace:create.nextStepsTitle')}</h4>
            <ol className="text-sm text-zinc-500 space-y-1.5 list-decimal list-inside">
              <li>{t('marketplace:create.nextSteps.attach')}</li>
              <li>{t('marketplace:create.nextSteps.ship')}</li>
              <li>{t('marketplace:create.nextSteps.scan')}</li>
              <li>{t('marketplace:create.nextSteps.funds')}</li>
            </ol>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to="/seller-dashboard" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
              {t('marketplace:create.goToDashboard')}
            </Link>
            <Link to={created ? `/listing/${created.id}` : '/browse'} className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">
              {t('marketplace:create.viewListing')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/seller-dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common:nav.sellerDashboard')}
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light tracking-tight">{t('marketplace:create.title')}</h1>
            <p className="text-sm text-zinc-500">{t('marketplace:create.subtitle')}</p>
          </div>
          <span className="text-xs text-zinc-600 bg-zinc-800/50 px-3 py-1 rounded-full">{t('marketplace:create.stepIndicator')}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('marketplace:create.photosLabel')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <div className="grid grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-500/50 group">
                  <img src={p.preview} alt={t('marketplace:create.photoAlt', { index: i + 1 })} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('common:actions.remove')}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-emerald-400 py-0.5">{t('marketplace:create.mainPhoto')}</span>}
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
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full capitalize">{species.category}</span>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{t('marketplace:create.careLabel')}: {species.care_level}</span>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{species.common_name_th}</span>
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
                onChange={(e) => setPrice(e.target.value)}
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
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">{t('marketplace:create.selectSize')}</option>
                {SIZES.map(s => <option key={s} value={s}>{t(`marketplace:create.sizeLabels.${s}`)}</option>)}
              </select>
              {errors.size && <p className="text-xs text-red-400 mt-1">{errors.size}</p>}
            </div>
          </div>

          {/* Price Position Indicator */}
          {marketStats && price && parseInt(price) > 0 && (
            <div className={`rounded-lg p-3 text-sm ${
              Math.abs(pricePosition) < 20 ? 'bg-emerald-500/10 border border-emerald-500/20' :
              pricePosition > 50 ? 'bg-amber-500/10 border border-amber-500/20' :
              'bg-blue-500/10 border border-blue-500/20'
            }`}>
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
                onChange={(e) => setPotSize(e.target.value)}
                placeholder={t('marketplace:create.potSizePlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.provinceLabel')}</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">{t('marketplace:create.selectProvince')}</option>
                {provinceOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {errors.province && <p className="text-xs text-red-400 mt-1">{errors.province}</p>}
            </div>
          </div>

          {/* Delivery Options */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t('marketplace:create.deliveryLabel')}</label>
            <div className="flex gap-3">
              {['ship', 'pickup'].map(opt => (
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

          {/* Precise pickup location */}
          {delivery.includes('pickup') && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.pickupAreaLabel')}</label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                maxLength={120}
                placeholder={t('marketplace:create.pickupAreaPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={geoStatus === 'loading'}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/50 text-zinc-300 disabled:opacity-50"
                >
                  {geoStatus === 'loading' ? t('common:actions.loading') : pickupCoords ? t('marketplace:create.updatePin') : t('marketplace:create.useLocation')}
                </button>
                {pickupCoords && (
                  <span className="text-xs text-emerald-400">
                    {t('marketplace:create.pinned')} {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                    <button type="button" onClick={() => setPickupCoords(null)} className="ml-2 text-zinc-500 hover:text-red-400">{t('common:actions.clear')}</button>
                  </span>
                )}
                {geoStatus === 'error' && <span className="text-xs text-red-400">{t('marketplace:create.locationError')}</span>}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{t('marketplace:create.pickupNote')}</p>
            </div>
          )}

          {/* Shipping Cost */}
          {delivery.includes('ship') && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.shippingCostLabel')}</label>
              <input
                type="number"
                min="0"
                max="5000"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder={t('marketplace:create.shippingCostPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              <p className="text-xs text-zinc-500 mt-1">{t('marketplace:create.freeShippingNote')}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('marketplace:create.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('marketplace:create.descriptionPlaceholder')}
              rows={5}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="flex justify-between mt-1">
              {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              <p className={`text-xs ml-auto ${description.length < 20 ? 'text-zinc-600' : 'text-emerald-400'}`}>{t('marketplace:create.chars', { count: description.length })}</p>
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
            <div className="relative">
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
                placeholder={t('marketplace:create.tagInputPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              {tagInput.trim() && tagSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg overflow-hidden shadow-xl">
                  {tagSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (!tags.includes(s) && tags.length < 10) setTags([...tags, s]);
                        setTagInput('');
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
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
              <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-zinc-300">
                  {t('marketplace:create.feeNotice')}
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base">
            {submitting ? t('marketplace:create.publishing') : t('marketplace:create.submitButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
