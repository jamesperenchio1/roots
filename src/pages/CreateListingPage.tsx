import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, QrCode, CheckCircle, Tag, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import SpeciesAutocomplete from '@/components/SpeciesAutocomplete';
import type { SpeciesEntry } from '@/data/speciesDatabase';
import { getSpeciesPriceStats } from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { createListing, uploadListingPhoto } from '@/lib/api';
import { generateQR } from '@/lib/promptpay';
import { validateImageFile, sanitizeText, isValidPrice } from '@/lib/validation';
import type { Listing, Category } from '@/types';

interface PhotoItem { file: File; preview: string; }

const SIZES = ['S', 'M', 'L', 'XL'] as const;
const SIZE_LABELS: Record<string, string> = {
  S: 'Small (under 15cm)',
  M: 'Medium (15-40cm)',
  L: 'Large (40-80cm)',
  XL: 'Extra Large (80cm+)',
};

export default function CreateListingPage() {
  const [step, setStep] = useState<'form' | 'qr'>('form');
  const [species, setSpecies] = useState<SpeciesEntry | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [potSize, setPotSize] = useState('');
  const [description, setDescription] = useState('');
  const [delivery, setDelivery] = useState<string[]>([]);
  const [province, setProvince] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Listing | null>(null);
  const [provenanceQR, setProvenanceQR] = useState('');
  const [qrDownloaded, setQrDownloaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isLocalAdmin } = useAuth();
  const navigate = useNavigate();
  const photoCount = photos.length;

  useEffect(() => {
    if (provenanceQR && created && !qrDownloaded) {
      setQrDownloaded(true);
      const a = document.createElement('a');
      a.href = provenanceQR;
      a.download = `root-provenance-${created.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [provenanceQR, created, qrDownloaded]);

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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!speciesQuery) e.species = 'Select or enter a species';
    if (!price || !isValidPrice(parseInt(price))) e.price = 'Minimum price is 10 THB, maximum 10M THB';
    if (!size) e.size = 'Select a size';
    if (!description || description.length < 20) e.description = 'Minimum 20 characters';
    if (delivery.length === 0) e.delivery = 'Select at least one delivery method';
    if (delivery.includes('pickup') && !province) e.province = 'Required for pickup';
    if (photoCount < 1) e.photos = 'At least 1 photo required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user || isLocalAdmin) {
      toast.error('Please sign up as a seller to create a real listing.');
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
        pickup_province: province || undefined,
        photos: urls,
      }, user);
      const qr = await generateQR(`${window.location.origin}/#/p/${listing.id}`, 220);
      setCreated(listing);
      setProvenanceQR(qr);
      setStep('qr');
      toast.success('Listing published to the market!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'qr') {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light mb-2">Listing Created!</h1>
          <p className="text-zinc-500 mb-2">
            Your {species?.common_name_en || speciesQuery} is now live on Root.
          </p>
          <p className="text-sm text-zinc-600 mb-6">
            Buyers can find it, compare prices, and purchase with escrow protection.
          </p>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2 justify-center">
              <QrCode className="w-4 h-4 text-purple-400" />
              Provenance QR Code
            </h3>
            <div className="w-48 h-48 bg-white rounded-xl mx-auto mb-3 p-3 flex items-center justify-center">
              {provenanceQR
                ? <img src={provenanceQR} alt="Provenance QR" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                : <QrCode className="w-28 h-28 text-zinc-900" />}
            </div>
            <p className="text-xs text-emerald-400 mb-2">
              Auto-downloaded to your device.
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Print and attach this QR tag to the plant pot. Every future owner can scan it to see its full history.
            </p>
            <div className="flex gap-2 justify-center">
              <a
                href={provenanceQR || '#'}
                download={`root-provenance-${created?.id || 'qr'}.png`}
                className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-black text-sm px-4 py-2 rounded-md font-medium"
              >
                Download Again
              </a>
              <Button type="button" variant="outline" className="border-white/10 text-sm" onClick={() => window.print()}>Print Tag</Button>
            </div>
          </div>

          {/* Print-only QR tag template */}
          <div className="hidden print:block">
            <div className="text-center py-10">
              <h1 className="text-2xl font-bold mb-2">Root Provenance Tag</h1>
              <p className="text-sm mb-6">{species?.common_name_en || speciesQuery}</p>
              <div className="w-64 h-64 bg-white rounded-xl mx-auto p-4 mb-4">
                <img src={provenanceQR} alt="Provenance QR" loading="lazy" decoding="async" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-zinc-500">Scan to verify authenticity and view full history</p>
              <p className="text-xs text-zinc-500 mt-1">{window.location.origin}/#/p/{created?.id}</p>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-left mb-6">
            <h4 className="text-sm font-medium mb-2">What happens next?</h4>
            <ol className="text-sm text-zinc-500 space-y-1.5 list-decimal list-inside">
              <li>Attach the QR tag to your plant</li>
              <li>When a buyer purchases, you will ship with the QR attached</li>
              <li>Buyer scans QR on arrival to confirm authenticity</li>
              <li>Funds release to your PromptPay automatically</li>
            </ol>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to="/seller-dashboard" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
              Go to Dashboard
            </Link>
            <Link to={created ? `/listing/${created.id}` : '/browse'} className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">
              View Listing
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
          <ArrowLeft className="w-4 h-4" /> Seller Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light tracking-tight">Create Listing</h1>
            <p className="text-sm text-zinc-500">List any plant — from basil to variegated monsters</p>
          </div>
          <span className="text-xs text-zinc-600 bg-zinc-800/50 px-3 py-1 rounded-full">Step 1 of 2</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photos */}
          <div>
            <label className="text-sm font-medium mb-2 block">Photos <span className="text-zinc-500 font-normal">(1-10)</span></label>
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
                  <img src={p.preview} alt={`Photo ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-emerald-400 py-0.5">Main</span>}
                </div>
              ))}
              {photos.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <Camera className="w-5 h-5 text-zinc-600" />
                  <span className="text-[10px] text-zinc-600">Add</span>
                </button>
              )}
            </div>
            {photoCount > 0 && (
              <p className="text-xs text-emerald-400/80 mt-1 inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {photoCount} photo{photoCount > 1 ? 's' : ''} ready
              </p>
            )}
            {errors.photos && <p className="text-xs text-red-400 mt-1">{errors.photos}</p>}
          </div>

          {/* Species Autocomplete */}
          <div>
            <SpeciesAutocomplete
              value={speciesQuery}
              onChange={handleSpeciesChange}
              label="Plant Species *"
              placeholder="Type 'basil', 'monstera', 'pothos'..."
            />
            {species && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full capitalize">{species.category}</span>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">Care: {species.care_level}</span>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{species.common_name_th}</span>
              </div>
            )}
            {errors.species && <p className="text-xs text-red-400 mt-1">{errors.species}</p>}
          </div>

          {/* Price with Market Context */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Price (THB) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 500"
                min="10"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              />
              {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Size *</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Select size</option>
                {SIZES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
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
                  Your price is <strong>{Math.abs(pricePosition).toFixed(0)}% {pricePosition > 0 ? 'above' : 'below'}</strong> the 30-day market median
                  ({marketStats.median.toLocaleString()} THB)
                </span>
              </div>
              {Math.abs(pricePosition) > 50 && (
                <p className="text-xs mt-1 text-amber-400">
                  Consider adjusting — extreme pricing may affect visibility
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pot Size (cm, optional)</label>
              <input
                type="number"
                value={potSize}
                onChange={(e) => setPotSize(e.target.value)}
                placeholder="e.g. 15"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pickup Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              >
                <option value="">Select province</option>
                {['Bangkok', 'Chiang Mai', 'Chiang Rai', 'Phuket', 'Pattaya', 'Nonthaburi', 'Khon Kaen', 'Udon Thani', 'Nakhon Ratchasima', 'Rayong'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {errors.province && <p className="text-xs text-red-400 mt-1">{errors.province}</p>}
            </div>
          </div>

          {/* Delivery Options */}
          <div>
            <label className="text-sm font-medium mb-2 block">Delivery Options *</label>
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
                  {opt === 'ship' ? 'Shipping' : 'Local Pickup'}
                </button>
              ))}
            </div>
            {errors.delivery && <p className="text-xs text-red-400 mt-1">{errors.delivery}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description * <span className="text-zinc-500 font-normal">(min 20 chars)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your plant: condition, care history, variegation %, parent plant info, reason for selling..."
              rows={5}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="flex justify-between mt-1">
              {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
              <p className={`text-xs ml-auto ${description.length < 20 ? 'text-zinc-600' : 'text-emerald-400'}`}>{description.length} chars</p>
            </div>
          </div>

          {/* Fee Notice */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-zinc-400">
                  When this sells, you will receive <strong className="text-white">{price ? (parseInt(price) * 0.92).toFixed(0) : '0'} THB</strong>
                  {' '}after the 8% platform fee ({price ? (parseInt(price) * 0.08).toFixed(0) : '0'} THB).
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  No listing fee. No monthly fee. You only pay when you sell.
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base">
            {submitting ? 'Publishing…' : 'Create Listing & Generate QR'}
          </Button>
        </form>
      </div>
    </div>
  );
}
