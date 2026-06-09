// Supabase-backed data access. Live rows (real users, listings and orders) are
// merged into the in-memory seed stores at boot so the existing synchronous
// getters in mockData.ts transparently include them. The rich seed catalog and
// market price history remain as demo content.
import { supabase, PHOTO_BUCKET } from './supabase';
import { SPECIES, USERS, LISTINGS, TRANSACTIONS, TRANSFERS, PLANT_IMAGES, NOTIFICATIONS, REVIEWS, OFFERS, PRICE_ALERTS, getListingByPlantId, MESSAGES, getListingById } from '@/data/mockData';
import type { Profile, Listing, Transaction, Species, Category, SizeCategory, DeliveryOption, Notification, Review, Offer, PriceAlert, Message } from '@/types';
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
  const id = r.id as string;
  const stats = getReviewStats(id);
  const existingRating = (r.rating as number | undefined) ?? undefined;
  return {
    id,
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
    rating: stats.count > 0 ? stats.average : (existingRating ?? 0),
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
    shipping_cost_thb: (r.shipping_cost_thb as number | undefined) || undefined,
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
  shipping_cost_thb?: number;
  pickup_province?: string;
  photos: string[];
  tags?: string[];
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
      shipping_cost_thb: input.shipping_cost_thb,
      pickup_province: input.pickup_province,
      image_url: input.photos[0] || null,
      photos: input.photos,
      tags: input.tags || [],
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
  const shipping = input.listing.shipping_cost_thb || 0;
  const total = price + shipping;
  const fee = Math.round(price * 0.08);
  const sellerId = input.listing.seller_id;
  const cover = input.listing.photos?.[0]?.storage_path;

  let txData: Record<string, unknown> | null = null;
  let supabaseError: Error | null = null;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        listing_id: input.listing.id,
        buyer_id: input.buyer.id,
        seller_id: sellerId,
        species_label: input.listing.species?.common_name_en || 'Plant',
        image_url: cover || null,
        sale_price_thb: total,
        platform_fee_thb: fee,
        seller_payout_thb: total - fee,
        shipping_cost_thb: shipping,
        status: 'paid_in_escrow',
        delivery_method: input.delivery_method,
        shipping_address: input.shipping_address || null,
        seller_promptpay_id: input.listing.seller?.promptpay_id || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    txData = data;
    // Mark the listing sold.
    await supabase.from('listings').update({ status: 'sold' }).eq('id', input.listing.id);
  } catch (err) {
    supabaseError = err instanceof Error ? err : new Error(String(err));
    logger.warn(`Supabase order creation failed, falling back to local: ${supabaseError.message}`);
  }

  // Fallback: create transaction locally if Supabase failed
  if (!txData) {
    const fallbackId = `tx-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    txData = {
      id: fallbackId,
      listing_id: input.listing.id,
      buyer_id: input.buyer.id,
      seller_id: sellerId,
      plant_id: input.listing.plant_id,
      sale_price_thb: total,
      platform_fee_thb: fee,
      seller_payout_thb: total - fee,
      shipping_cost_thb: shipping,
      status: 'paid_in_escrow',
      delivery_method: input.delivery_method,
      tracking_number: null,
      courier: null,
      shipped_at: null,
      delivered_at: null,
      escrow_release_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
  }

  // Update local LISTINGS so the sold item disappears from browse immediately
  const localListing = LISTINGS.find(l => l.id === input.listing.id);
  if (localListing) localListing.status = 'sold';

  const tx = mapTransaction(txData, { ...profileCache, [input.buyer.id]: input.buyer });
  upsertById(TRANSACTIONS, tx);
  return tx;
}

export async function updateOrderStatus(id: string, patch: Partial<Record<string, unknown>>): Promise<void> {
  await supabase.from('transactions').update(patch).eq('id', id);
  const tx = TRANSACTIONS.find((t) => t.id === id);
  if (tx) Object.assign(tx, patch);
}

export async function updateListing(id: string, patch: Partial<NewListingInput>): Promise<Listing> {
  const { data, error } = await supabase.from('listings').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  const updated = mapListing(data, profileCache);
  upsertById(LISTINGS, updated);
  return updated;
}

export async function withdrawListing(id: string): Promise<void> {
  const { error } = await supabase.from('listings').update({ status: 'withdrawn' }).eq('id', id);
  if (error) throw error;
  const local = LISTINGS.find(l => l.id === id);
  if (local) local.status = 'withdrawn';
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

// ---------- notifications ----------
export function getNotifications(userId: string): Notification[] {
  return NOTIFICATIONS
    .filter(n => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getUnreadCount(userId: string): number {
  return NOTIFICATIONS.filter(n => n.user_id === userId && !n.read).length;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) logger.warn('markNotificationRead failed', { error: error.message });
  const local = NOTIFICATIONS.find(n => n.id === notificationId);
  if (local) local.read = true;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);
  if (error) logger.warn('markAllNotificationsRead failed', { error: error.message });
  NOTIFICATIONS.filter(n => n.user_id === userId).forEach(n => { n.read = true; });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) logger.warn('deleteNotification failed', { error: error.message });
  const idx = NOTIFICATIONS.findIndex(n => n.id === notificationId);
  if (idx >= 0) NOTIFICATIONS.splice(idx, 1);
}

export async function createNotification(
  data: Omit<Notification, 'id' | 'created_at'>
): Promise<Notification> {
  const payload = { ...data, created_at: new Date().toISOString() };
  const { data: row, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('*')
    .single();
  if (error) {
    logger.warn('createNotification supabase failed, using local only', { error: error.message });
  }
  const notification: Notification = {
    id: row?.id ?? `local-${crypto.randomUUID()}`,
    ...payload,
  };
  NOTIFICATIONS.push(notification);
  return notification;
}

// ---------- notification helpers ----------
export function notifyNewOrder(sellerId: string, orderId: string, plantName: string, amount: number) {
  return createNotification({
    user_id: sellerId,
    type: 'order',
    title: 'New order received',
    message: `Someone purchased your ${plantName} for ${amount.toLocaleString()} THB`,
    link: `/order/${orderId}`,
    read: false,
  });
}

export function notifyOrderShipped(buyerId: string, orderId: string, courier: string) {
  return createNotification({
    user_id: buyerId,
    type: 'shipment',
    title: 'Order shipped',
    message: `Your order has been shipped via ${courier}`,
    link: `/order/${orderId}`,
    read: false,
  });
}

export function notifyDisputeOpened(sellerId: string, _disputeId: string, orderId: string) {
  return createNotification({
    user_id: sellerId,
    type: 'dispute',
    title: 'Dispute opened',
    message: `A buyer opened a dispute on order #${orderId}`,
    link: `/order/${orderId}/dispute`,
    read: false,
  });
}

export function notifyOfferReceived(sellerId: string, offerId: string, listingName: string, amount: number) {
  return createNotification({
    user_id: sellerId,
    type: 'offer',
    title: 'New offer received',
    message: `A buyer offered ${amount.toLocaleString()} THB for your ${listingName}`,
    link: `/offers/${offerId}`,
    read: false,
  });
}

export function notifyOfferResponse(buyerId: string, offerId: string, status: string) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return createNotification({
    user_id: buyerId,
    type: 'offer',
    title: `Offer ${label.toLowerCase()}`,
    message: `Your offer was ${status.toLowerCase()}`,
    link: `/offers/${offerId}`,
    read: false,
  });
}

export function notifyNewMessage(recipientId: string, senderName: string, message: string, threadId: string) {
  return createNotification({
    user_id: recipientId,
    type: 'message',
    title: 'New message',
    message: `${senderName}: "${message.length > 50 ? message.slice(0, 50) + '...' : message}"`,
    link: `/messages/${threadId}`,
    read: false,
  });
}

export function getProfileFromCache(id: string): Profile | undefined {
  return profileCache[id];
}

// ---------- reviews ----------
export function getReviewsBySeller(sellerId: string): Review[] {
  return REVIEWS.filter((r) => r.seller_id === sellerId).map((r) => ({
    ...r,
    reviewer: USERS.find((u) => u.id === r.reviewer_id),
  }));
}

export function getReviewsByListing(listingId: string): Review[] {
  return REVIEWS.filter((r) => r.listing_id === listingId).map((r) => ({
    ...r,
    reviewer: USERS.find((u) => u.id === r.reviewer_id),
  }));
}

export function getReviewStats(sellerId: string): { average: number; count: number; distribution: Record<number, number> } {
  const reviews = REVIEWS.filter((r) => r.seller_id === sellerId);
  const count = reviews.length;
  if (count === 0) {
    return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  });
  return { average: Math.round((sum / count) * 10) / 10, count, distribution };
}

export async function createReview(data: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
  const { data: row, error } = await supabase
    .from('reviews')
    .insert({
      transaction_id: data.transaction_id,
      listing_id: data.listing_id,
      reviewer_id: data.reviewer_id,
      seller_id: data.seller_id,
      rating: data.rating,
      comment: sanitizeText(data.comment, 2000),
      tags: data.tags,
    })
    .select('*')
    .single();
  if (error) throw error;
  const review: Review = {
    id: row.id as string,
    transaction_id: row.transaction_id as string,
    listing_id: row.listing_id as string,
    reviewer_id: row.reviewer_id as string,
    seller_id: row.seller_id as string,
    rating: row.rating as number,
    comment: row.comment as string,
    tags: (row.tags as string[]) || [],
    created_at: row.created_at as string,
    reviewer: USERS.find((u) => u.id === data.reviewer_id),
  };
  upsertById(REVIEWS, review);
  return review;
}

export function hasReviewed(transactionId: string, reviewerId: string): boolean {
  return REVIEWS.some((r) => r.transaction_id === transactionId && r.reviewer_id === reviewerId);
}

// ---------- offers ----------
export function getOffersForSeller(sellerId: string): Offer[] {
  return OFFERS.filter(o => o.seller_id === sellerId).map(o => ({
    ...o,
    listing: LISTINGS.find(l => l.id === o.listing_id),
    buyer: USERS.find(u => u.id === o.buyer_id),
  }));
}

export function getOffersForBuyer(buyerId: string): Offer[] {
  return OFFERS.filter(o => o.buyer_id === buyerId).map(o => ({
    ...o,
    listing: LISTINGS.find(l => l.id === o.listing_id),
    seller: USERS.find(u => u.id === o.seller_id),
  }));
}

export function getOffersForListing(listingId: string): Offer[] {
  return OFFERS.filter(o => o.listing_id === listingId);
}

export async function createOffer(
  data: Omit<Offer, 'id' | 'created_at' | 'status' | 'responded_at'>
): Promise<Offer> {
  const offer: Offer = {
    ...data,
    id: `o-${crypto.randomUUID().slice(0, 8)}`,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  // Try supabase first, fallback to local
  const { error } = await supabase.from('offers').insert({
    listing_id: data.listing_id,
    buyer_id: data.buyer_id,
    seller_id: data.seller_id,
    offer_price_thb: data.offer_price_thb,
    message: data.message || null,
    status: 'pending',
  });
  if (error) {
    logger.warn('createOffer supabase failed, using local only', { error: error.message });
  }
  OFFERS.push(offer);
  return offer;
}

export async function respondToOffer(
  offerId: string,
  response: 'accepted' | 'rejected' | 'countered',
  counterPrice?: number
): Promise<Offer> {
  const offer = OFFERS.find(o => o.id === offerId);
  if (!offer) throw new Error('Offer not found');
  const patch: Partial<Offer> = {
    status: response,
    responded_at: new Date().toISOString(),
  };
  if (response === 'countered' && counterPrice !== undefined) {
    patch.counter_price_thb = counterPrice;
  }
  const { error } = await supabase.from('offers').update(patch).eq('id', offerId);
  if (error) {
    logger.warn('respondToOffer supabase failed, using local only', { error: error.message });
  }
  Object.assign(offer, patch);
  return offer;
}

export async function withdrawOffer(offerId: string): Promise<void> {
  const offer = OFFERS.find(o => o.id === offerId);
  if (!offer) throw new Error('Offer not found');
  const { error } = await supabase.from('offers').update({ status: 'withdrawn', responded_at: new Date().toISOString() }).eq('id', offerId);
  if (error) {
    logger.warn('withdrawOffer supabase failed, using local only', { error: error.message });
  }
  offer.status = 'withdrawn';
  offer.responded_at = new Date().toISOString();
}

// ---------- price alerts ----------
export function getUserPriceAlerts(userId: string): PriceAlert[] {
  return PRICE_ALERTS.filter(pa => pa.user_id === userId).map(pa => ({
    ...pa,
    species: SPECIES.find(s => s.id === pa.species_id),
  }));
}

export async function createPriceAlert(
  data: Omit<PriceAlert, 'id' | 'created_at'>
): Promise<PriceAlert> {
  const alert: PriceAlert = {
    ...data,
    id: `pa-${crypto.randomUUID().slice(0, 8)}`,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('price_alerts').insert({
    user_id: data.user_id,
    species_id: data.species_id,
    size_category: data.size_category || null,
    threshold_thb: data.threshold_thb,
    direction: data.direction,
  });
  if (error) {
    logger.warn('createPriceAlert supabase failed, using local only', { error: error.message });
  }
  PRICE_ALERTS.push(alert);
  return alert;
}

export async function deletePriceAlert(alertId: string): Promise<void> {
  const { error } = await supabase.from('price_alerts').delete().eq('id', alertId);
  if (error) {
    logger.warn('deletePriceAlert supabase failed, using local only', { error: error.message });
  }
  const idx = PRICE_ALERTS.findIndex(pa => pa.id === alertId);
  if (idx >= 0) PRICE_ALERTS.splice(idx, 1);
}

export function checkPriceAlerts(speciesId: string, currentPrice: number): PriceAlert[] {
  return PRICE_ALERTS.filter(pa => {
    if (pa.species_id !== speciesId) return false;
    if (pa.direction === 'below') return currentPrice <= pa.threshold_thb;
    return currentPrice >= pa.threshold_thb;
  });
}

// ---------- messaging ----------
export function detectContactInfo(text: string): boolean {
  const lineIdPattern = /(?:LINE[:\s]+|ไลน์\s+)([a-zA-Z0-9._-]+)|@([a-zA-Z0-9._-]+)/i;
  const thaiPhonePattern = /0\d{1,2}[-.]?\d{3}[-.]?\d{4}/;
  const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/;
  return lineIdPattern.test(text) || thaiPhonePattern.test(text) || emailPattern.test(text) || urlPattern.test(text);
}

export function getUserThreads(userId: string): { threadId: string; otherUser: Profile | undefined; lastMessage: Message; unreadCount: number; listing?: Listing }[] {
  const userMessages = MESSAGES.filter(m => m.sender_id === userId || m.recipient_id === userId);
  const threadIds = Array.from(new Set(userMessages.map(m => m.thread_id)));
  return threadIds.map(threadId => {
    const threadMessages = MESSAGES.filter(m => m.thread_id === threadId).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const lastMessage = threadMessages[threadMessages.length - 1];
    const otherUserId = lastMessage.sender_id === userId ? lastMessage.recipient_id : lastMessage.sender_id;
    const otherUser = USERS.find(u => u.id === otherUserId);
    const unreadCount = threadMessages.filter(m => m.recipient_id === userId && !m.read_at).length;
    const listing = lastMessage.listing_id ? getListingById(lastMessage.listing_id) : undefined;
    return {
      threadId,
      otherUser,
      lastMessage: { ...lastMessage, sender: lastMessage.sender || USERS.find(u => u.id === lastMessage.sender_id) },
      unreadCount,
      listing,
    };
  }).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
}

export function getThreadMessages(threadId: string): Message[] {
  return MESSAGES.filter(m => m.thread_id === threadId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(m => ({ ...m, sender: m.sender || USERS.find(u => u.id === m.sender_id) }));
}

export async function sendMessage(data: Omit<Message, 'id' | 'created_at' | 'sender'>): Promise<Message> {
  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created_at = new Date().toISOString();
  const flagged = detectContactInfo(data.content);
  const message: Message = {
    ...data,
    id,
    created_at,
    flagged_contact_info: flagged,
    sender: USERS.find(u => u.id === data.sender_id),
  };
  try {
    await supabase.from('messages').insert({
      id,
      thread_id: data.thread_id,
      sender_id: data.sender_id,
      recipient_id: data.recipient_id,
      listing_id: data.listing_id,
      content: data.content,
      flagged_contact_info: flagged,
      created_at,
    });
  } catch (e) {
    logger.warn('sendMessage supabase failed, using local only', { error: e instanceof Error ? e.message : String(e) });
  }
  MESSAGES.push(message);
  return message;
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  MESSAGES.forEach(m => {
    if (m.thread_id === threadId && m.recipient_id === userId && !m.read_at) {
      m.read_at = now;
    }
  });
  try {
    await supabase
      .from('messages')
      .update({ read_at: now })
      .eq('thread_id', threadId)
      .eq('recipient_id', userId)
      .is('read_at', null);
  } catch (e) {
    logger.warn('markThreadRead supabase failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export function getOrCreateThreadId(userId: string, otherUserId: string, listingId?: string): string {
  const sortedIds = [userId, otherUserId].sort();
  return `thread_${sortedIds[0]}_${sortedIds[1]}_${listingId || 'general'}`;
}

export { SPECIES };
