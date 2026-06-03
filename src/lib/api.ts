// Supabase-backed data access. Live rows (real users, listings and orders) are
// merged into the in-memory seed stores at boot so the existing synchronous
// getters in mockData.ts transparently include them. The rich seed catalog and
// market price history remain as demo content.
import { supabase, PHOTO_BUCKET } from './supabase';
import { SPECIES, USERS, LISTINGS, TRANSACTIONS, TRANSFERS, PLANT_IMAGES, getListingByPlantId } from '@/data/mockData';
import type { Profile, Listing, Transaction, Species, Category, SizeCategory, DeliveryOption } from '@/types';

const FALLBACK_IMG = '/images/plants/monstera-thai.jpg';

function upsertById<T extends { id: string }>(arr: T[], row: T) {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i >= 0) arr[i] = row;
  else arr.push(row);
}

// ---------- mappers ----------
export function mapProfile(r: any): Profile {
  return {
    id: r.id,
    display_name: r.display_name ?? 'Plant Lover',
    promptpay_id: r.promptpay_id ?? null,
    is_admin: !!r.is_admin,
    strike_count: r.strike_count ?? 0,
    is_banned: !!r.is_banned,
    language_preference: (r.language_preference as 'th' | 'en') ?? 'en',
    created_at: r.created_at,
    updated_at: r.updated_at ?? r.created_at,
    avatar_url: r.avatar_url ?? undefined,
    location: r.location ?? undefined,
    rating: r.rating ?? undefined,
    sales_count: r.sales_count ?? 0,
  };
}

function speciesFromRow(r: any): Species {
  return {
    id: r.species_id || `live-${r.id}`,
    scientific_name: r.species_scientific || r.species_common_en || 'Plant',
    common_name_en: r.species_common_en || r.species_scientific || 'Plant',
    common_name_th: r.species_common_th || undefined,
    synonyms: [],
    category: (r.category as Category) || 'other',
    created_at: r.created_at,
  };
}

export function mapListing(r: any, profiles: Record<string, Profile>): Listing {
  const photos = (r.photos && r.photos.length ? r.photos : [r.image_url].filter(Boolean)) as string[];
  const cover = photos[0] || (r.species_id ? PLANT_IMAGES[r.species_id] : '') || FALLBACK_IMG;
  return {
    id: r.id,
    plant_id: r.id,
    seller_id: r.seller_id,
    price_thb: r.price_thb,
    size_category: (r.size_category as SizeCategory) || 'M',
    size_cm_range: r.size_cm_range || undefined,
    pot_size_cm: r.pot_size_cm || undefined,
    description: r.description || '',
    delivery_options: (r.delivery_options as DeliveryOption[]) || ['ship'],
    pickup_province: r.pickup_province || undefined,
    status: r.status || 'active',
    created_at: r.created_at,
    last_photo_update_at: r.last_photo_update_at || r.created_at,
    view_count: r.view_count ?? 0,
    watch_count: r.watch_count ?? 0,
    species: speciesFromRow(r),
    seller: profiles[r.seller_id],
    photos: photos.map((url, i) => ({
      id: `lp-${r.id}-${i}`,
      listing_id: r.id,
      storage_path: url || cover,
      order_index: i,
      created_at: r.created_at,
    })),
  };
}

function mapTransaction(r: any, profiles: Record<string, Profile>): Transaction {
  return {
    id: r.id,
    listing_id: r.listing_id,
    buyer_id: r.buyer_id,
    seller_id: r.seller_id,
    plant_id: r.listing_id,
    sale_price_thb: r.sale_price_thb,
    platform_fee_thb: r.platform_fee_thb ?? 0,
    seller_payout_thb: r.seller_payout_thb ?? 0,
    status: r.status,
    delivery_method: r.delivery_method || 'ship',
    tracking_number: r.tracking_number || undefined,
    courier: r.courier || undefined,
    created_at: r.created_at,
    shipped_at: r.shipped_at || undefined,
    delivered_at: r.delivered_at || undefined,
    completed_at: r.completed_at || undefined,
    buyer: profiles[r.buyer_id],
    seller: profiles[r.seller_id],
    listing: {
      id: r.listing_id || r.id,
      plant_id: r.listing_id || r.id,
      seller_id: r.seller_id,
      price_thb: r.sale_price_thb,
      size_category: 'M',
      description: '',
      delivery_options: [r.delivery_method || 'ship'],
      status: 'sold',
      created_at: r.created_at,
      last_photo_update_at: r.created_at,
      species: {
        id: 'live',
        scientific_name: r.species_label || 'Plant',
        common_name_en: r.species_label || 'Plant',
        synonyms: [],
        category: 'other',
        created_at: r.created_at,
      },
      photos: r.image_url
        ? [{ id: `t-${r.id}`, listing_id: r.listing_id || r.id, storage_path: r.image_url, order_index: 0, created_at: r.created_at }]
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
    console.warn('hydratePublicData failed, using seed data only', e);
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
    console.warn('hydrateUserTransactions failed', e);
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
      description: input.description,
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
    console.warn('ensurePhotoBucket:', e);
  }
}

export async function uploadListingPhoto(file: File, userId: string): Promise<string> {
  await ensurePhotoBucket();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

export async function updateOrderStatus(id: string, patch: Partial<Record<string, any>>): Promise<void> {
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
  const bucket = 'dispute-evidence';
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
    reason: input.reason,
    description: input.description,
    evidence_urls: input.evidence_urls,
    status: 'open',
  });
  if (error) throw error;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
  const user = USERS.find(u => u.id === userId);
  if (user) Object.assign(user, patch);
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
