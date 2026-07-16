import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useSpeciesPriceStats } from '@/hooks/queries/useSpeciesPriceStats';
import { searchSpecies, type SpeciesEntry as SpeciesDbEntry } from '@/data/speciesDatabase';
import type { SpeciesEntry } from '@/data/speciesDatabase';
import { getLatestResult } from '@/lib/identification/api-identification';
import { useAuth } from '@/hooks/useAuth';
import { createListing, uploadListingPhoto, fetchPlant } from '@/lib/api';
import { getUserLocations } from '@/lib/locations';
import type { UserLocation } from '@/types';
import { generateQR } from '@/lib/promptpay';
import { validateImageFile, sanitizeText, isValidPrice } from '@/lib/validation';
import { getProvinceOptions } from '@/lib/provinces';
import type { ProvinceOption } from '@/lib/provinces';
import type { Listing, Category, IdentificationResult } from '@/types';
import { CreateListingHeader, DeliverySection, DescriptionSection, FeeNotice, MarketStatsNotice, PhotosSection, PickupLocationSection, PotSizeProvinceSection, PrefillBanner, PriceSizeSection, QRProvenanceSection, QRView, SavedPlacesSelect, ShippingCostSection, SpeciesSection, SubmitButton, SubmittedView, TagsSection } from '@/components/create-listing';
import { UnsavedChangesBlocker } from '@/components/UnsavedChangesBlocker';

interface PhotoItem {
  file: File;
  preview: string;
}

const SIZES = ['S', 'M', 'L', 'XL'] as const;

export default function CreateListingPage() {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const provinceOptions: ProvinceOption[] = useMemo(
    () => getProvinceOptions(i18n.language),
    [i18n.language]
  );
  const [searchParams] = useSearchParams();
  const identificationId = searchParams.get('identificationId');
  const prefillSpeciesId = searchParams.get('speciesId');

  const [prefillResult, setPrefillResult] = useState<IdentificationResult | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'qr' | 'submitted'>('form');
  const [savedPlaces, setSavedPlaces] = useState<UserLocation[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [hasQrProvenance, setHasQrProvenance] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Listing | null>(null);

  const isDirty = useMemo(() => {
    if (step !== 'form') return false;
    return (
      species !== null ||
      speciesQuery.trim() !== '' ||
      price !== '' ||
      size !== '' ||
      potSize !== '' ||
      description.trim() !== '' ||
      delivery.length > 0 ||
      shippingCost !== '' ||
      province !== '' ||
      pickupLocation.trim() !== '' ||
      pickupCoords !== null ||
      tags.length > 0 ||
      photos.length > 0 ||
      !hasQrProvenance
    );
  }, [step, species, speciesQuery, price, size, potSize, description, delivery, shippingCost, province, pickupLocation, pickupCoords, tags, photos, hasQrProvenance]);
  const [provenanceQR, setProvenanceQR] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setPlacesLoading(true);
    getUserLocations(user.id)
      .then((places) => {
        if (mounted) setSavedPlaces(places);
      })
      .catch(() => {
        /* saved places are optional */
      })
      .finally(() => {
        if (mounted) setPlacesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const place = savedPlaces.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    if (place.province) setProvince(place.province);
    if (place.address_line) setPickupLocation(place.address_line);
    if (place.lat && place.lng) setPickupCoords({ lat: place.lat, lng: place.lng });
  }, [selectedPlaceId, savedPlaces]);

  useEffect(() => {
    if (!identificationId) return;
    let mounted = true;
    setPrefillLoading(true);
    getLatestResult(identificationId)
      .then((result) => {
        if (!result || !mounted) return;
        setPrefillResult(result);
        const query = result.scientific_name;
        let match: SpeciesDbEntry | undefined;
        if (prefillSpeciesId) {
          const candidates = searchSpecies(query, 10);
          match = candidates.find((s) => s.id === prefillSpeciesId);
        }
        if (!match) {
          const candidates = searchSpecies(query, 5);
          match = candidates[0];
        }
        setSpeciesQuery(match ? `${match.scientific_name} (${match.common_name_en})` : query);
        if (match) setSpecies(match);
        const estimate = result.market_estimate;
        if (estimate?.suggested_range_low) {
          setPrice(String(estimate.suggested_range_low));
        }
        const descParts = [
          result.common_names.length ? `Common names: ${result.common_names.join(', ')}` : '',
          result.reasoning,
          result.care_summary,
        ].filter(Boolean);
        if (descParts.length) setDescription(descParts.join('. '));
        if (result.detected_characteristics.length) {
          setTags(result.detected_characteristics.slice(0, 5));
        }
      })
      .catch(() => {
        // Prefill is best-effort; ignore errors so the seller can still fill manually.
      })
      .finally(() => {
        if (mounted) setPrefillLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [identificationId, prefillSpeciesId]);

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
    setPhotos((prev) => [...prev, ...next].slice(0, 10));
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const marketStats = useSpeciesPriceStats(species?.id, 30);

  const handleSpeciesChange = (query: string, selected?: SpeciesEntry) => {
    setSpeciesQuery(query);
    if (selected) setSpecies(selected);
  };

  const toggleDelivery = (opt: string) => {
    setDelivery((prev) => (prev.includes(opt) ? prev.filter((d) => d !== opt) : [...prev, opt]));
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
    if (!user) {
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
      const listing = await createListing(
        {
          species_id: species?.id,
          species_scientific: species?.scientific_name || speciesQuery,
          species_common_en: species?.common_name_en || speciesQuery,
          species_common_th: species?.common_name_th,
          category: (species?.category as Category) || 'other',
          price_thb: parseInt(price),
          size_category: size,
          status: 'pending_review',
          pot_size_cm: potSize ? parseInt(potSize) : undefined,
          description: sanitizeText(description, 2000),
          delivery_options: delivery,
          shipping_cost_thb: delivery.includes('ship')
            ? shippingCost
              ? parseInt(shippingCost)
              : 0
            : undefined,
          pickup_province: province || undefined,
          pickup_location: delivery.includes('pickup')
            ? pickupLocation.trim() || undefined
            : undefined,
          pickup_lat: delivery.includes('pickup') ? pickupCoords?.lat : undefined,
          pickup_lng: delivery.includes('pickup') ? pickupCoords?.lng : undefined,
          photos: urls,
          tags: tags.length > 0 ? tags : undefined,
          has_qr_provenance: hasQrProvenance,
        },
        user
      );
      setCreated(listing);
      if (!hasQrProvenance || !listing.plant_id) {
        setStep('submitted');
        toast.success(t('marketplace:create.published'));
        return;
      }
      const plant = await fetchPlant(listing.plant_id);
      const signature = plant?.qr_signature || '';
      const qrUrl = `${window.location.origin}/#/p/${listing.plant_id}${signature ? `?s=${signature}` : ''}`;
      const qr = await generateQR(qrUrl, 220);
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

  if (step === 'submitted') {
    return <SubmittedView created={created} />;
  }

  if (step === 'qr') {
    return (
      <QRView
        created={created}
        provenanceQR={provenanceQR}
        speciesName={species?.common_name_en || speciesQuery}
      />
    );
  }

  return (
    <>
      <UnsavedChangesBlocker isDirty={isDirty} />
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <CreateListingHeader />
        <PrefillBanner prefillLoading={prefillLoading} prefillResult={prefillResult} />

        <form onSubmit={handleSubmit} className="space-y-5">
          <PhotosSection
            fileInputRef={fileInputRef}
            photos={photos}
            onFiles={handleFiles}
            onRemove={removePhoto}
            error={errors.photos}
          />
          <SpeciesSection
            value={speciesQuery}
            onChange={handleSpeciesChange}
            species={species}
            error={errors.species}
          />
          <PriceSizeSection
            price={price}
            setPrice={setPrice}
            size={size}
            setSize={setSize}
            sizes={SIZES}
            errors={{ price: errors.price, size: errors.size }}
          />
          <MarketStatsNotice marketStats={marketStats} price={price} currency={currency} />
          <SavedPlacesSelect
            loading={placesLoading}
            places={savedPlaces}
            selectedId={selectedPlaceId}
            onSelect={setSelectedPlaceId}
          />
          <PotSizeProvinceSection
            potSize={potSize}
            setPotSize={setPotSize}
            province={province}
            setProvince={setProvince}
            provinceOptions={provinceOptions}
            error={errors.province}
          />
          <DeliverySection delivery={delivery} toggle={toggleDelivery} error={errors.delivery} />
          {delivery.includes('pickup') && (
            <PickupLocationSection
              coords={pickupCoords}
              onChange={(value) => {
                setPickupCoords({ lat: value.lat, lng: value.lng });
                if (value.address && !pickupLocation) setPickupLocation(value.address);
              }}
              pickupLocation={pickupLocation}
              setPickupLocation={setPickupLocation}
            />
          )}
          {delivery.includes('ship') && (
            <ShippingCostSection shippingCost={shippingCost} setShippingCost={setShippingCost} />
          )}
          <DescriptionSection
            description={description}
            setDescription={setDescription}
            error={errors.description}
          />
          <TagsSection
            tags={tags}
            setTags={setTags}
            tagInput={tagInput}
            setTagInput={setTagInput}
          />
          <QRProvenanceSection checked={hasQrProvenance} onChange={setHasQrProvenance} />
          <FeeNotice price={price} currency={currency} />
          <SubmitButton submitting={submitting} />
        </form>
      </div>
    </div>
    </>
  );
}
