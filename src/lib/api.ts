// Supabase-backed data access. Live rows (real users, listings and orders) are
// merged into the in-memory seed stores at boot so the existing synchronous
// getters in mockData.ts transparently include them. The rich seed catalog and
// market price history remain as demo content.
import { supabase, PHOTO_BUCKET } from './supabase';
import { SPECIES, USERS, LISTINGS, TRANSACTIONS, TRANSFERS, PLANT_IMAGES, getListingByPlantId } from '@/data/mockData';
import type { Profile, Listing, Transaction, Species, Category, SizeCategory, DeliveryOption } from '@/types';
import { validateImageFile, sanitizeText } from './validation';
import { logger } from './logger';

const FALLBACK_IMG = '/images/plants/monstera-thai.jpg';

function upsertById<T extends { id: string }>(arr: T[], row: T) {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i >= 0) arr[i] = row;
  else arr.push(row);
}

// ---------- mappers ----------
type DbRow = Record<string, unknown>;

export function mapProfile(r: DbRow): Profile {
  return {
    id: r.id as string,
    display_name: (r.display_name as string | undefined) ?? 'Plant Lover',
    promptpay_id: (r.promptpay_id as string | undefined) ?? null,
    is_admin: !!r.is_admin,
    strike_count: (r.strike_count as number | undefined) ?? 0,
    is_banned: !!r.is_banned,
    language_preference: (r.language_preference as 'th' | 'en' | undefined) ?? 'en',
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string | undefined) ?? (r.created_at as string),
    avatar_url: (r.avatar_url as string | undefined) ?? undefined,
    location: (r.location as string | undefined) ?? undefined,
    rating: (r.rating as number | undefined) ?? undefined,
    sales_count: (r.sales_count as number | undefined) ?? 0,
  };
}

function speciesFromRow(r: DbRow): Species {
  return {
    id: (r.species_id as string | undefined) || `live-${r.id as string}`,
    scientific_name: (r.species_scientific as string | undefined) || (r.species_common_en as string | undefined) || 'Plant',
    common_name_th: (r.species_common_th as string | undefined) || undefined,
    common_name_en: (r.species_common_en as string | undefined) || (r.species_scientific as string | undefined) || 'Plant',
    synonyms: [],
    category: (r.category as Category | undefined) || 'other',
    created_at: r.created_at as string,
  };
}

export function mapListing(r: DbRow, profiles: Record<string, Profile>): Listing {
  const photosArr = r.photos as string[] | undefined;
  const imageUrl = r.image_url as string | undefined;
  const photos = (photosArr && photosArr.length ? photosArr : [imageUrl].filter(Boolean)) as string[];
  const speciesId = r.species_id as string | undefined;
  const cover = photos[0] || (speciesId ? PLANT_IMAGES[speciesId] : '') || FALLBACK_IMG;
  const sellerId = r.seller_id as string;
  return {
    id: r.id as string,
    plant_id: r.id as string,
    seller_id: sellerId,
    price_thb: r.price_thb as number,
    size_category: (r.size_category as SizeCategory | undefined) || 'M',
    size_cm_range: (r.size_cm_range as string | undefined) || undefined,
    pot_size_cm: (r.pot_size_cm as number | undefined) || undefined,
    description: (r.description as string | undefined) || '',
    delivery_options: (r.delivery_options as DeliveryOption[] | undefined) || ['ship'],
    pickup_province: (r.pickup_province as string | undefined) || undefined,
    status: (r.status as Listing['status'] | undefined) || 'active',
    created_at: r.created_at as string,
    last_photo_update_at: (r.last_photo_update_at as string | undefined) || (r.created_at as string),
    view_count: (r.view_count as number | undefined) ?? 0,
    watch_count: (r.watch_count as number | undefined) ?? 0,
    species: speciesFromRow(r),
    seller: profiles[sellerId],
    photos: photos.map((url, i) => ({
      id: `lp-${r.id as string}-${i}`,
      listing_id: r.id as string,
      storage_path: url || cover,
      order_index: i,
      created_at: r.created_at as string,
    })),
  };
}

function mapTransaction(r: DbRow, profiles: Record<string, Profile>): Transaction {
  const buyerId = r.buyer_id as string;
  const sellerId = r.seller_id as string;
  const listingId = r.listing_id as string;
  const id = r.id as string;
  return {
    id,
    listing_id: listingId,
    buyer_id: buyerId,
    seller_id: sellerId,
    plant_id: listingId,
    sale_price_thb: r.sale_price_thb as number,
    platform_fee_thb: (r.platform_fee_thb as number | undefined) ?? 0,
    seller_payout_thb: (r.seller_payout_thb as number | undefined) ?? 0,
    status: r.status as Transaction['status'],
    delivery_method: (r.delivery_method as DeliveryOption | undefined) || 'ship',
    tracking_number: (r.tracking_number as string | undefined) || undefined,
    courier: (r.courier as string | undefined) || undefined,
    created_at: r.created_at as string,
    shipped_at: (r.shipped_at as string | undefined) || undefined,
    delivered_at: (r.delivered_at as string | undefined) || undefined,
    completed_at: (r.completed_at as string | undefined) || undefined,
    buyer: profiles[buyerId],
    seller: profiles[sellerId],
    listing: {
      id: listingId || id,
      plant_id: listingId || id,
      seller_id: sellerId,
      price_thb: r.sale_price_thb as number,
      size_category: 'M',
      description: '',
      delivery_options: [(r.delivery_method as DeliveryOption | undefined) || 'ship'],
      status: 'sold',
      created_at: r.created_at as string,
      last_photo_update_at: r.created_at as string,
      species: {
        id: 'live',
        scientific_name: (r.species_label as string | undefined) || 'Plant',
        common_name_en: (r.species_label as string | undefined) || 'Plant',
        synonyms: [],
        category: 'other',
        created_at: r.created_at as string,
      },
      photos: r.image_url
        ? [{ id: `t-${id}`, listing_id: listingId || id, storage_path: r.image_url as string, order_index: 0, created_at: r.created_at as string }]
        : [],
    } as Listing,
  };
}

// ---------- boot hydration ----------
let profileCache: Record<string, Profile> = {};

export async function hydratePublicData(): Promise<void> {
  try {
    const [{ data: profs }, { data: rows }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    ]);
    profileCache = {};
    (profs || []).forEach((p) => {
      const mapped = mapProfile(p);
      profileCache[mapped.id] = mapped;
      upsertById(USERS, mapped);
    });
    (rows || []).forEach((r) => upsertById(LISTINGS, mapListing(r, profileCache)));
  } catch (e) {
    // Offline / not configured — fall back to seed-only catalog.
    logger.warn('hydratePublicData failed, using seed data only', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function hydrateUserTransactions(): Promise<void> {
  try {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    (data || []).forEach((r) => upsertById(TRANSACTIONS, mapTransaction(r, profileCache)));
  } catch (e) {
    logger.warn('hydrateUserTransactions failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

// ---------- writes ----------
export interface NewListingInput {
  species_id?: string;
  species_scientific?: string;
  species_common_en?: string;
  species_common_th?: string;
  category: Category;
  price_thb: number;
  size_category: string;
  pot_size_cm?: number;
  description: string;
  delivery_options: string[];
  pickup_province?: string;
  photos: string[];
}

export async function createListing(input: NewListingInput, seller: Profile): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: seller.id,
      species_id: input.species_id,
      species_scientific: input.species_scientific,
      species_common_en: input.species_common_en,
      species_common_th: input.species_common_th,
      category: input.category,
      price_thb: input.price_thb,
      size_category: input.size_category,
      pot_size_cm: input.pot_size_cm,
      description: sanitizeText(input.description, 2000),
      delivery_options: input.delivery_options,
      pickup_province: input.pickup_province,
      image_url: input.photos[0] || null,
      photos: input.photos,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!profileCache[seller.id]) profileCache[seller.id] = seller;
  const listing = mapListing(data, profileCache);
  upsertById(LISTINGS, listing);
  return listing;
}

export async function ensurePhotoBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === PHOTO_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(PHOTO_BUCKET, { public: true, fileSizeLimit: 10485760 });
    }
  } catch (e) {
    logger.warn('ensurePhotoBucket failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function uploadListingPhoto(file: File, userId: string): Promise<string> {
  const validation = validateImageFile(file, 5);
  if (!validation.ok) throw new Error(validation.error);
  await ensurePhotoBucket();
  // Derive extension from MIME type (trusted) rather than filename (spoofable)
  const ext = file.type.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface NewOrderInput {
  listing: Listing;
  buyer: Profile;
  shipping_address?: Record<string, string>;
  delivery_method: string;
}

export async function createOrder(input: NewOrderInput): Promise<Transaction> {
  const price = input.listing.price_thb;
  const fee = Math.round(price * 0.08);
  const sellerId = input.listing.seller_id;
  const cover = input.listing.photos?.[0]?.storage_path;
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      listing_id: input.listing.id,
      buyer_id: input.buyer.id,
      seller_id: sellerId,
      species_label: input.listing.species?.common_name_en || 'Plant',
      image_url: cover || null,
      sale_price_thb: price,
      platform_fee_thb: fee,
      seller_payout_thb: price - fee,
      status: 'paid_in_escrow',
      delivery_method: input.delivery_method,
      shipping_address: input.shipping_address || null,
      seller_promptpay_id: input.listing.seller?.promptpay_id || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  // Mark the listing sold.
  await supabase.from('listings').update({ status: 'sold' }).eq('id', input.listing.id);
  const tx = mapTransaction(data, { ...profileCache, [input.buyer.id]: input.buyer });
  upsertById(TRANSACTIONS, tx);
  return tx;
}

export async function updateOrderStatus(id: string, patch: Partial<Record<string, unknown>>): Promise<void> {
  await supabase.from('transactions').update(patch).eq('id', id);
  const tx = TRANSACTIONS.find((t) => t.id === id);
  if (tx) Object.assign(tx, patch);
}

export async function fetchProvenance(plantId: string): Promise<{ listing: Listing | null; transfers: import('@/types').Transfer[] }> {
  const listing = getListingByPlantId(plantId) || null;
  const mockTransfers = TRANSFERS.filter(t => t.plant_id === plantId);
  if (mockTransfers.length > 0) {
    return { listing, transfers: mockTransfers };
  }
  try {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('plant_id', plantId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });
    const transfers = (data || []).map((r, i) => ({
      id: `live-tr-${i}`,
      plant_id: plantId,
      from_user_id: r.seller_id,
      to_user_id: r.buyer_id,
      transaction_id: r.id,
      sale_price_thb: r.sale_price_thb,
      transferred_at: r.completed_at || r.created_at,
    }));
    return { listing, transfers };
  } catch (e) {
    return { listing, transfers: [] };
  }
}

export async function uploadDisputeEvidence(file: File, userId: string): Promise<string> {
  const validation = validateImageFile(file, 5);
  if (!validation.ok) throw new Error(validation.error);
  const bucket = 'dispute-evidence';
  const ext = file.type.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  let uploadError = await supabase.storage.from(bucket).upload(path, file, { upsert: false }).then(r => r.error);
  if (uploadError && (uploadError.message?.includes('Bucket') || uploadError.message?.includes('not found'))) {
    await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: 10485760 });
    uploadError = await supabase.storage.from(bucket).upload(path, file, { upsert: false }).then(r => r.error);
  }
  if (uploadError) throw uploadError;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function createDispute(input: {
  transaction_id: string;
  opened_by: 'buyer' | 'seller';
  reason: string;
  description: string;
  evidence_urls: string[];
}): Promise<void> {
  const { error } = await supabase.from('disputes').insert({
    transaction_id: input.transaction_id,
    opened_by: input.opened_by,
    reason: sanitizeText(input.reason, 50),
    description: sanitizeText(input.description, 2000),
    evidence_urls: input.evidence_urls,
    status: 'open',
  });
  if (error) throw error;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const cleanPatch: Record<string, any> = {};
  if (patch.display_name !== undefined) cleanPatch.display_name = sanitizeText(patch.display_name, 50);
  if (patch.promptpay_id !== undefined) cleanPatch.promptpay_id = patch.promptpay_id ? sanitizeText(patch.promptpay_id, 20) : null;
  if (patch.language_preference !== undefined) cleanPatch.language_preference = patch.language_preference;
  if (patch.location !== undefined) cleanPatch.location = patch.location ? sanitizeText(patch.location, 50) : null;
  if (patch.avatar_url !== undefined) cleanPatch.avatar_url = patch.avatar_url;

  const { error } = await supabase.from('profiles').update(cleanPatch).eq('id', userId);
  if (error) throw error;
  const user = USERS.find(u => u.id === userId);
  if (user) Object.assign(user, cleanPatch);
}

export async function toggleWatch(
  userId: string,
  watchType: 'species' | 'listing',
  targetId: string,
  on: boolean
): Promise<void> {
  if (on) {
    await supabase.from('watchlist').upsert(
      { user_id: userId, watch_type: watchType, target_id: targetId },
      { onConflict: 'user_id,watch_type,target_id' }
    );
  } else {
    await supabase
      .from('watchlist')
      .delete()
      .match({ user_id: userId, watch_type: watchType, target_id: targetId });
  }
}

export function getProfileFromCache(id: string): Profile | undefined {
  return profileCache[id];
}

export { SPECIES };
