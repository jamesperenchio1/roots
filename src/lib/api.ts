// Supabase-backed data access. Public reads return fresh mapped rows and are
// cached via TanStack Query; the legacy in-memory seed stores remain only as
// fallback initial data for a handful of un-migrated getters.
import { supabase, PHOTO_BUCKET } from './supabase';
import { SPECIES, USERS, LISTINGS, TRANSACTIONS, PLANT_IMAGES, NOTIFICATIONS, SELLER_REVIEWS, COMMENTS, COMMENT_IMAGES, COMMENT_REACTIONS, OFFERS, PRICE_ALERTS, WATCHLIST, getListingByPlantId, getListingById, getSpeciesById, bumpPriceSnapshots } from '@/data/mockData';
import { ALL_SPECIES } from '@/data/speciesDatabase';
import type { Profile, Listing, Transaction, TransactionEvent, TransactionStatus, Species, Category, SizeCategory, DeliveryOption, Notification, SellerReview, Comment, CommentImage, CommentReaction, Offer, PriceAlert, Dispute, PriceSnapshot, Plant, QRScan, WatchlistItem, WatchType, MarketOverview, TrendingSpecies, DashboardStats } from '@/types';
import { validateImageFile, sanitizeText } from './validation';
import { logger } from './logger';
import { queryClient } from './queryClient';
import { publicKeys, userKeys, commentKeys } from './queryKeys';
import i18n from '@/i18n/config';
import { sendMessage as sendMessageV2, getOrCreateDirectConversation } from './messaging';

// Messaging v2 re-exports for backward compatibility.
export {
  mapMessage,
  hydrateUserMessages,
  getOrCreateThreadId,
  detectContactInfo,
} from './messaging';

const FALLBACK_IMG = '/images/plants/monstera-thai.jpg';

function invalidatePublicQueries() {
  queryClient.invalidateQueries({ queryKey: publicKeys.all() });
}

function invalidateUserQueries(userId: string) {
  queryClient.invalidateQueries({ queryKey: userKeys.all(userId) });
}

function invalidateTransactionDetail(transactionId: string) {
  queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
}

function upsertById<T extends { id: string }>(arr: T[], row: T) {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i >= 0) arr[i] = row;
  else arr.push(row);
}

// ---------- mappers ----------
type DbRow = Record<string, unknown>;

export function mapProfile(r: DbRow): Profile {
  const id = r.id as string;
  const stats = getSellerReviewStats(id);
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
    onboarding_status: (r.onboarding_status as Record<string, unknown> | undefined) ?? {},
  };
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return null;
    return mapProfile(data);
  } catch (e) {
    logger.warn('fetchProfile failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
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

export async function mapListing(r: DbRow, profiles: Record<string, Profile>): Promise<Listing> {
  const photosArr = r.photos as string[] | undefined;
  const imageUrl = r.image_url as string | undefined;
  const photos = (photosArr && photosArr.length ? photosArr : [imageUrl].filter(Boolean)) as string[];
  const speciesId = r.species_id as string | undefined;
  const cover = photos[0] || (speciesId ? PLANT_IMAGES[speciesId] : '') || FALLBACK_IMG;
  const sellerId = r.seller_id as string;
  // Callers are responsible for hydrating the profile map in batch; no per-row
  // fetch so we avoid N+1 queries when mapping large result sets.
  const seller = profiles[sellerId];
  return {
    id: r.id as string,
    plant_id: (r.plant_id as string | undefined) || undefined,
    has_qr_provenance: (r.has_qr_provenance as boolean | undefined) !== false,
    seller_id: sellerId,
    price_thb: r.price_thb as number,
    size_category: (r.size_category as SizeCategory | undefined) || 'M',
    size_cm_range: (r.size_cm_range as string | undefined) || undefined,
    pot_size_cm: (r.pot_size_cm as number | undefined) || undefined,
    description: (r.description as string | undefined) || '',
    delivery_options: (r.delivery_options as DeliveryOption[] | undefined) || ['ship'],
    shipping_cost_thb: (r.shipping_cost_thb as number | undefined) || undefined,
    pickup_province: (r.pickup_province as string | undefined) || undefined,
    pickup_location: (r.pickup_location as string | undefined) || undefined,
    pickup_lat: (r.pickup_lat as number | undefined) ?? undefined,
    pickup_lng: (r.pickup_lng as number | undefined) ?? undefined,
    status: (r.status as Listing['status'] | undefined) || 'active',
    review_status: (r.review_status as string | undefined) || undefined,
    qr_verification_photo_url: (r.qr_verification_photo_url as string | undefined) || undefined,
    qr_verified_at: (r.qr_verified_at as string | undefined) || undefined,
    qr_verified_by: (r.qr_verified_by as string | undefined) || undefined,
    reviewed_at: (r.reviewed_at as string | undefined) || undefined,
    reviewed_by: (r.reviewed_by as string | undefined) || undefined,
    review_reason: (r.review_reason as string | undefined) || undefined,
    review_notes: (r.review_notes as string | undefined) || undefined,
    created_at: r.created_at as string,
    last_photo_update_at: (r.last_photo_update_at as string | undefined) || (r.created_at as string),
    view_count: (r.view_count as number | undefined) ?? 0,
    tags: (r.tags as string[] | undefined) || [],
    watch_count: (r.watch_count as number | undefined) ?? WATCHLIST.filter(w => w.watch_type === 'listing' && w.target_id === r.id).length,
    species: speciesFromRow(r),
    seller,
    photos: photos.map((url, i) => ({
      id: `lp-${r.id as string}-${i}`,
      listing_id: r.id as string,
      storage_path: url || cover,
      order_index: i,
      created_at: r.created_at as string,
    })),
  };
}

async function mapTransaction(r: DbRow, profiles: Record<string, Profile>): Promise<Transaction> {
  const buyerId = r.buyer_id as string;
  const sellerId = r.seller_id as string;
  const listingId = r.listing_id as string;
  const id = r.id as string;

  // If the query joined the linked listing, build a real Listing object from it.
  const linkedListing = r.listings as DbRow | undefined;
  let listing: Listing;
  if (linkedListing && linkedListing.id) {
    listing = await mapListing(linkedListing, profiles);
    listing.status = 'sold';
    listing.price_thb = r.sale_price_thb as number;
  } else {
    listing = {
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
        id: (r.species_label as string | undefined) || 'live',
        scientific_name: (r.species_label as string | undefined) || 'Plant',
        common_name_en: (r.species_label as string | undefined) || 'Plant',
        synonyms: [],
        category: 'other',
        created_at: r.created_at as string,
      },
      photos: r.image_url
        ? [{ id: `t-${id}`, listing_id: listingId || id, storage_path: r.image_url as string, order_index: 0, created_at: r.created_at as string }]
        : [],
    } as Listing;
  }

  return {
    id,
    listing_id: listingId,
    buyer_id: buyerId,
    seller_id: sellerId,
    plant_id: listing.plant_id || listingId || id,
    sale_price_thb: r.sale_price_thb as number,
    platform_fee_thb: (r.platform_fee_thb as number | undefined) ?? 0,
    seller_payout_thb: (r.seller_payout_thb as number | undefined) ?? 0,
    status: r.status as Transaction['status'],
    delivery_method: (r.delivery_method as DeliveryOption | undefined) || 'ship',
    tracking_number: (r.tracking_number as string | undefined) || undefined,
    courier: (r.courier as string | undefined) || undefined,
    payment_slip_path: (r.payment_slip_path as string | undefined) || undefined,
    payment_ref: (r.payment_ref as string | undefined) || undefined,
    payment_confirmed: !!r.payment_confirmed,
    payment_confirmed_at: (r.payment_confirmed_at as string | undefined) || undefined,
    created_at: r.created_at as string,
    shipped_at: (r.shipped_at as string | undefined) || undefined,
    delivered_at: (r.delivered_at as string | undefined) || undefined,
    completed_at: (r.completed_at as string | undefined) || undefined,
    buyer: profiles[buyerId],
    seller: profiles[sellerId],
    listing,
  };
}

// ---------- boot hydration ----------
let profileCache: Record<string, Profile> = {};

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

export type PublicData = {
  users: Profile[];
  listings: Listing[];
  sellerReviews: SellerReview[];
  priceSnapshots: PriceSnapshot[];
  transactions: Transaction[];
};

export async function fetchPublicData(): Promise<PublicData> {
  const data = await fetchPublicDataRaw();
  // Keep an in-memory profile cache for mappers, but do not write back to the
  // legacy mutable arrays now that readers use TanStack Query.
  profileCache = data.users.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<string, Profile>);
  return data;
}

async function fetchProfileMap(): Promise<Record<string, Profile>> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    const map: Record<string, Profile> = {};
    (data || []).forEach((r) => {
      const p = mapProfile(r);
      map[p.id] = p;
    });
    return map;
  } catch (e) {
    logger.warn('fetchProfileMap failed', { error: e instanceof Error ? e.message : String(e) });
    return {};
  }
}

async function fetchPublicDataRaw(): Promise<PublicData> {
  const timeoutMs = 8000;
  const profileReq = supabase.from('profiles').select('*').then((r) => r);
  const listingsReq = supabase.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).then((r) => r);
  const sellerReviewsReq = supabase.from('seller_reviews').select('*').eq('status', 'visible').order('created_at', { ascending: false }).then((r) => r);
  const [{ data: profs }, { data: rows }, { data: sellerReviewRows }] = await Promise.all([
    withTimeout(profileReq, timeoutMs),
    withTimeout(listingsReq, timeoutMs),
    withTimeout(sellerReviewsReq, timeoutMs),
  ]);

  const cache: Record<string, Profile> = {};
  const users: Profile[] = [];
  (profs || []).forEach((p: DbRow) => {
    const mapped = mapProfile(p);
    cache[mapped.id] = mapped;
    users.push(mapped);
  });

  const listings: Listing[] = [];
  await Promise.all((rows || []).map(async (r: DbRow) => {
    listings.push(await mapListing(r, cache));
  }));

  const sellerReviews: SellerReview[] = [];
  (sellerReviewRows || []).forEach((r: DbRow) => sellerReviews.push(mapSellerReview(r)));

  const priceSnapshots = await fetchPriceSnapshots();
  const transactions = await fetchPublicTransactions(cache);

  return { users, listings, sellerReviews, priceSnapshots, transactions };
}

async function fetchPriceSnapshots(): Promise<PriceSnapshot[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('*')
      .gte('snapshot_date', cutoff.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapPriceSnapshot(r));
  } catch (e) {
    logger.warn('fetchPriceSnapshots failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

async function fetchPublicTransactions(profileMap: Record<string, Profile>): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, listings(*)')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return await Promise.all((data || []).map(async (r) => mapTransaction(r, profileMap)));
  } catch (e) {
    logger.warn('fetchPublicTransactions failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export function mapPriceSnapshot(r: DbRow): PriceSnapshot {
  return {
    id: r.id as string,
    species_id: r.species_id as string,
    size_category: (r.size_category as SizeCategory | undefined) ?? undefined,
    snapshot_date: r.snapshot_date as string,
    median_price_thb: (r.median_price_thb as number | undefined) ?? 0,
    mean_price_thb: (r.mean_price_thb as number | undefined) ?? 0,
    min_price_thb: (r.min_price_thb as number | undefined) ?? 0,
    max_price_thb: (r.max_price_thb as number | undefined) ?? 0,
    sale_count: (r.sale_count as number | undefined) ?? 0,
    created_at: r.created_at as string,
  };
}

export async function fetchUserTransactions(): Promise<Transaction[]> {
  try {
    const { data } = await supabase
      .from('transactions')
      .select('*, listings(*)')
      .order('created_at', { ascending: false });
    const profiles = await fetchProfileMap();
    profileCache = { ...profileCache, ...profiles };
    return await Promise.all((data || []).map(async (r) => mapTransaction(r, profiles)));
  } catch (e) {
    logger.warn('fetchUserTransactions failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export async function fetchTransactionById(id: string): Promise<Transaction | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, listings(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return null;
    const profiles = await fetchProfileMap();
    profileCache = { ...profileCache, ...profiles };
    return await mapTransaction(data, profiles);
  } catch (e) {
    logger.warn('fetchTransactionById failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export function getPriceSnapshotsForSpeciesFromData(
  snapshots: PriceSnapshot[],
  speciesId: string,
  sizeCategory?: string,
  days: number = 90
): PriceSnapshot[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return snapshots
    .filter((ps) =>
      ps.species_id === speciesId &&
      (sizeCategory ? ps.size_category === sizeCategory : ps.size_category == null) &&
      new Date(ps.snapshot_date) >= cutoff
    )
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
}

export function getSpeciesPriceStatsFromData(
  snapshots: PriceSnapshot[],
  listings: Listing[],
  speciesId: string,
  days: number = 30
) {
  const data = getPriceSnapshotsForSpeciesFromData(snapshots, speciesId, undefined, days);
  if (data.length === 0) {
    const live = listings.filter((l) => l.status === 'active' && l.species?.id === speciesId);
    if (live.length === 0) return null;
    const prices = live.map((l) => l.price_thb).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    return { median, mean, min: prices[0], max: prices[prices.length - 1], totalSales: 0 };
  }
  const prices = data.map((d) => d.median_price_thb);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const totalSales = data.reduce((s, d) => s + d.sale_count, 0);
  return { median, mean, min, max, totalSales };
}

export function getMarketSpeciesFromData(data: PublicData | undefined): Species[] {
  const ids = new Set<string>();
  ALL_SPECIES.forEach((s) => ids.add(s.id));
  (data?.listings ?? []).forEach((l) => { if (l.species?.id) ids.add(l.species.id); });
  (data?.transactions ?? []).forEach((t) => { if (t.listing?.species?.id) ids.add(t.listing.species.id); });
  return Array.from(ids)
    .map((id) => getSpeciesById(id))
    .filter((s): s is Species => !!s);
}

export function getMarketOverviewFromData(data: PublicData): MarketOverview {
  const { listings, priceSnapshots, transactions } = data;
  const speciesIds = Array.from(
    new Set([
      ...priceSnapshots.map((s) => s.species_id),
      ...listings.filter((l) => l.status === 'active' && l.species?.id).map((l) => l.species!.id),
    ])
  );

  const allStats = speciesIds
    .map((sid) => {
      const last30 = getSpeciesPriceStatsFromData(priceSnapshots, listings, sid, 30);
      const prev60to30 = getPriceSnapshotsForSpeciesFromData(priceSnapshots, sid, undefined, 60).slice(0, 30);
      const prevMedian =
        prev60to30.length > 0
          ? Math.round(prev60to30.reduce((s, p) => s + p.median_price_thb, 0) / prev60to30.length)
          : last30?.median || 0;
      const sales30d = last30?.totalSales || 0;
      const sparkline = getPriceSnapshotsForSpeciesFromData(priceSnapshots, sid, undefined, 30).map(
        (d) => d.median_price_thb
      );
      const species = getSpeciesById(sid);
      if (!species) return null;
      return {
        species,
        current_median: last30?.median || 0,
        previous_median: prevMedian,
        percent_change: prevMedian > 0 ? ((last30?.median || 0) - prevMedian) / prevMedian * 100 : 0,
        sales_count: sales30d,
        sparkline_data: sparkline,
      };
    })
    .filter((s): s is TrendingSpecies => !!s);

  const trending_up = allStats
    .filter((s) => s.percent_change > 5)
    .sort((a, b) => b.percent_change - a.percent_change)
    .slice(0, 5);

  const trending_down = allStats
    .filter((s) => s.percent_change < -3)
    .sort((a, b) => a.percent_change - b.percent_change)
    .slice(0, 4);

  const most_traded = [...allStats].sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);

  const hot_right_now = allStats
    .filter((s) => s.percent_change > 2)
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5);

  const cold = allStats
    .filter((s) => s.percent_change < -2)
    .sort((a, b) => a.percent_change - b.percent_change)
    .slice(0, 4);

  return {
    trending_up,
    trending_down,
    most_traded,
    high_value_sales: transactions.filter((t) => t.status === 'completed' && t.sale_price_thb >= 5000),
    hot_right_now,
    cold,
  };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  try {
    const [profilesCount, activeListingsCount, openDisputesCount, transactionsRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase
        .from('transactions')
        .select('created_at, sale_price_thb, status')
        .order('created_at', { ascending: false })
        .limit(10000),
    ]);

    const txs = (transactionsRes.data || []) as Array<{ created_at: string; sale_price_thb: number | null; status: string }>;
    const gmvSince = (ms: number) =>
      txs
        .filter((t) => now - new Date(t.created_at).getTime() <= ms)
        .reduce((sum, t) => sum + (t.sale_price_thb || 0), 0);
    const completed = txs.filter((t) => t.status === 'completed').length;
    const disputed = txs.filter((t) => t.status === 'disputed').length;

    return {
      gmv_today: gmvSince(DAY),
      gmv_week: gmvSince(7 * DAY),
      gmv_month: gmvSince(30 * DAY),
      active_listings: activeListingsCount.count ?? 0,
      dispute_rate: completed > 0 ? Math.round((disputed / completed) * 1000) / 10 : 0,
      user_count: profilesCount.count ?? 0,
      pending_disputes: openDisputesCount.count ?? 0,
      pending_payouts: txs.filter((t) => t.status === 'delivered').length,
    };
  } catch (e) {
    logger.warn('fetchDashboardStats failed', { error: e instanceof Error ? e.message : String(e) });
    return {
      gmv_today: 0,
      gmv_week: 0,
      gmv_month: 0,
      active_listings: 0,
      dispute_rate: 0,
      user_count: 0,
      pending_disputes: 0,
      pending_payouts: 0,
    };
  }
}

export async function fetchUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      type: r.type as Notification['type'],
      title: r.title as string,
      message: (r.message as string) || '',
      link: (r.link as string | undefined) || undefined,
      read: !!r.read,
      created_at: r.created_at as string,
    }));
  } catch (e) {
    logger.warn('fetchUserNotifications failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

function mapOffer(r: DbRow): Offer {
  return {
    id: r.id as string,
    listing_id: r.listing_id as string,
    buyer_id: r.buyer_id as string,
    seller_id: r.seller_id as string,
    offer_price_thb: r.offer_price_thb as number,
    message: (r.message as string | undefined) || undefined,
    status: r.status as Offer['status'],
    counter_price_thb: (r.counter_price_thb as number | undefined) ?? undefined,
    conversation_id: (r.conversation_id as string | undefined) || undefined,
    created_at: r.created_at as string,
    responded_at: (r.responded_at as string | undefined) || undefined,
  };
}

export async function fetchUserOffers(): Promise<Offer[]> {
  // RLS limits the result to offers where the caller is buyer or seller.
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapOffer(r));
  } catch (e) {
    logger.warn('fetchUserOffers failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

function mapSellerReview(r: DbRow): SellerReview {
  return {
    id: r.id as string,
    transaction_id: (r.transaction_id as string | undefined) || undefined,
    reviewer_id: r.reviewer_id as string,
    seller_id: r.seller_id as string,
    rating: r.rating as number,
    comment: (r.comment as string | undefined) || undefined,
    would_buy_again: (r.would_buy_again as boolean | undefined) ?? undefined,
    packaging_rating: (r.packaging_rating as number | undefined) ?? undefined,
    plant_condition_rating: (r.plant_condition_rating as number | undefined) ?? undefined,
    communication_rating: (r.communication_rating as number | undefined) ?? undefined,
    shipping_speed_rating: (r.shipping_speed_rating as number | undefined) ?? undefined,
    listing_accuracy_rating: (r.listing_accuracy_rating as number | undefined) ?? undefined,
    image_urls: (r.image_urls as string[] | undefined) || [],
    verified_purchase: (r.verified_purchase as boolean | undefined) ?? true,
    status: (r.status as SellerReview['status'] | undefined) || 'visible',
    admin_notes: (r.admin_notes as string | undefined) || undefined,
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string | undefined) || (r.created_at as string),
    reviewer: USERS.find((u) => u.id === (r.reviewer_id as string)),
  };
}

function mapPriceAlert(r: DbRow): PriceAlert {
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    species_id: r.species_id as string,
    size_category: (r.size_category as PriceAlert['size_category']) ?? undefined,
    threshold_thb: r.threshold_thb as number,
    direction: r.direction as PriceAlert['direction'],
    triggered_at: (r.triggered_at as string | undefined) || undefined,
    created_at: r.created_at as string,
  };
}

export async function fetchUserPriceAlerts(): Promise<PriceAlert[]> {
  // RLS limits the result to the caller's own alerts.
  try {
    const { data, error } = await supabase.from('price_alerts').select('*');
    if (error) throw error;
    return (data || []).map((r) => mapPriceAlert(r));
  } catch (e) {
    logger.warn('fetchUserPriceAlerts failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

function mapDispute(r: DbRow): Dispute {
  return {
    id: r.id as string,
    transaction_id: r.transaction_id as string,
    opened_by: r.opened_by as Dispute['opened_by'],
    reason: r.reason as Dispute['reason'],
    description: (r.description as string) || '',
    evidence_urls: (r.evidence_urls as string[]) || [],
    status: r.status as Dispute['status'],
    admin_notes: (r.admin_notes as string | undefined) || undefined,
    resolution_amount_thb: (r.resolution_amount_thb as number | undefined) ?? undefined,
    created_at: r.created_at as string,
    resolved_at: (r.resolved_at as string | undefined) || undefined,
  };
}

export async function fetchUserDisputes(): Promise<Dispute[]> {
  // RLS returns disputes where the caller is a party to the transaction, or all
  // disputes if the caller is an admin.
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapDispute(r));
  } catch (e) {
    logger.warn('fetchUserDisputes failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
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
  status?: Listing['status'];
  pot_size_cm?: number;
  description: string;
  delivery_options: string[];
  shipping_cost_thb?: number;
  pickup_province?: string;
  pickup_location?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  photos: string[];
  tags?: string[];
  has_qr_provenance?: boolean;
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
      status: input.status || 'pending_review',
      pot_size_cm: input.pot_size_cm,
      description: sanitizeText(input.description, 2000),
      delivery_options: input.delivery_options,
      shipping_cost_thb: input.shipping_cost_thb,
      pickup_province: input.pickup_province,
      pickup_location: input.pickup_location,
      pickup_lat: input.pickup_lat,
      pickup_lng: input.pickup_lng,
      image_url: input.photos[0] || null,
      photos: input.photos,
      tags: input.tags || [],
      has_qr_provenance: input.has_qr_provenance !== false,
    })
    .select('*')
    .single();
  if (error) throw error;
  if (!profileCache[seller.id]) profileCache[seller.id] = seller;
  const listing = await mapListing(data, profileCache);
  upsertById(LISTINGS, listing);
  invalidatePublicQueries();
  invalidateUserQueries(seller.id);
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
  payment_slip_path?: string;
  payment_ref?: string;
}

const SLIP_BUCKET = 'payment-slips';

// Upload a payment slip to the PRIVATE slips bucket; returns the storage path
// (not a public URL — slips contain bank details and are read via signed URLs).
export async function uploadPaymentSlip(file: File, userId: string): Promise<string> {
  const validation = validateImageFile(file, 5);
  if (!validation.ok) throw new Error(validation.error);
  const ext = file.type.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(SLIP_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

// Short-lived signed URL so only the transaction parties can view a slip.
export async function getSignedSlipUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(SLIP_BUCKET).createSignedUrl(path, 3600);
  if (error) {
    logger.warn('getSignedSlipUrl failed', { error: error.message });
    return null;
  }
  return data.signedUrl;
}

// Ask the verify-slip edge function to auto-verify a slip via SlipOK. Returns:
//  'verified' — SlipOK confirmed a genuine, amount-matching slip (the function
//               already flipped payment_confirmed server-side);
//  'failed'   — a slip was checked but didn't pass (amount/recipient/dup);
//  'manual'   — SlipOK isn't configured or was unreachable; fall back to the
//               seller's manual confirmation. Never throws.
export async function requestSlipVerification(transactionId: string): Promise<'verified' | 'failed' | 'manual'> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-slip', { body: { transactionId } });
    if (error) {
      logger.warn('verify-slip invoke failed', { error: error.message });
      return 'manual';
    }
    const status = (data?.status as string) || 'manual';
    if (status === 'verified') {
      const tx = TRANSACTIONS.find((t) => t.id === transactionId);
      if (tx) {
        tx.payment_confirmed = true;
        tx.payment_confirmed_at = new Date().toISOString();
      }
      return 'verified';
    }
    return status === 'failed' ? 'failed' : 'manual';
  } catch (e) {
    logger.warn('verify-slip threw', { error: e instanceof Error ? e.message : String(e) });
    return 'manual';
  }
}

// Seller (who owns the PromptPay account) confirms the money arrived. This is
// the real verification step — it unlocks shipping. A SlipOK/EasySlip API call
// could perform this automatically in the future.
export async function confirmPaymentReceived(txId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(i18n.t('common:errors.unauthorized'));

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('id, seller_id, buyer_id, payment_confirmed')
    .eq('id', txId)
    .single();
  if (txError || !tx) throw txError || new Error('Transaction not found');

  const profile = await fetchProfile(userData.user.id);
  const isSeller = tx.seller_id === userData.user.id;
  const isAdmin = !!profile?.is_admin;
  if (!isSeller && !isAdmin) {
    throw new Error('Only the seller can confirm payment');
  }

  if (tx.payment_confirmed) return;

  const confirmedAt = new Date().toISOString();
  const { error } = await supabase
    .from('transactions')
    .update({ payment_confirmed: true, payment_confirmed_at: confirmedAt })
    .eq('id', txId);
  if (error) {
    logger.warn('confirmPaymentReceived failed', { error: error.message });
    throw error;
  }
  const localTx = TRANSACTIONS.find((t) => t.id === txId);
  if (localTx) {
    localTx.payment_confirmed = true;
    localTx.payment_confirmed_at = confirmedAt;
    notifyPaymentConfirmed(localTx.buyer_id, txId);
  } else {
    notifyPaymentConfirmed(tx.buyer_id as string, txId);
  }
  invalidateTransactionDetail(txId);
  invalidateUserQueries(tx.buyer_id as string);
  invalidateUserQueries(tx.seller_id as string);
}

export async function createOrder(input: NewOrderInput): Promise<Transaction> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(i18n.t('common:errors.unauthorized'));
  if (userData.user.id !== input.buyer.id) throw new Error(i18n.t('common:errors.unauthorized'));

  const price = input.listing.price_thb;
  const shipping = input.listing.shipping_cost_thb || 0;
  const total = price + shipping;
  const fee = Math.round(price * 0.08);
  const sellerId = input.listing.seller_id;
  if (input.buyer.id === sellerId) {
    throw new Error(i18n.t('checkout:errors.ownListing'));
  }

  const { data: listingCheck, error: listingCheckError } = await supabase
    .from('listings')
    .select('status, seller_id')
    .eq('id', input.listing.id)
    .single();
  if (listingCheckError || !listingCheck) throw listingCheckError || new Error('Listing not found');
  if (listingCheck.status !== 'active') {
    throw new Error(i18n.t('checkout:errors.listingUnavailable'));
  }
  if (listingCheck.seller_id !== sellerId) {
    throw new Error(i18n.t('common:errors.unauthorized'));
  }

  const cover = input.listing.photos?.[0]?.storage_path;

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
      payment_slip_path: input.payment_slip_path || null,
      payment_ref: input.payment_ref || null,
      payment_confirmed: false,
    })
    .select('*')
    .single();
  if (error) {
    logger.error('createOrder failed', error as Error);
    throw error;
  }

  // Mark the listing sold.
  const { error: listingError } = await supabase.from('listings').update({ status: 'sold' }).eq('id', input.listing.id);
  if (listingError) {
    logger.error('createOrder: failed to mark listing sold', listingError as Error);
    throw listingError;
  }

  // Update local LISTINGS so the sold item disappears from browse immediately
  const localListing = LISTINGS.find(l => l.id === input.listing.id);
  if (localListing) localListing.status = 'sold';

  const tx = await mapTransaction(data, { ...profileCache, [input.buyer.id]: input.buyer });
  upsertById(TRANSACTIONS, tx);
  invalidatePublicQueries();
  invalidateUserQueries(input.buyer.id);
  // Always notify the seller a sale came in — wired here so no call site can forget.
  notifyNewOrder(sellerId, tx.id, input.listing.species?.common_name_en || 'plant', total);
  return tx;
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid_in_escrow', 'cancelled'],
  paid_in_escrow: ['shipped', 'disputed', 'cancelled'],
  shipped: ['delivered', 'disputed', 'cancelled'],
  delivered: ['completed', 'disputed'],
  completed: ['disputed'],
  disputed: ['refunded', 'completed', 'cancelled'],
  refunded: [],
  cancelled: [],
};

function canTransition(current: string, next: string): boolean {
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

const ALLOWED_ORDER_UPDATE_FIELDS = new Set([
  'status',
  'shipped_at',
  'delivered_at',
  'completed_at',
  'courier',
  'tracking_number',
  'dispute_reason',
]);

export async function updateOrderStatus(id: string, patch: Partial<Record<string, unknown>>): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(i18n.t('common:errors.unauthorized'));

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('id, buyer_id, seller_id, status')
    .eq('id', id)
    .single();
  if (txError || !tx) throw txError || new Error('Transaction not found');

  const profile = await fetchProfile(userData.user.id);
  const isAdmin = !!profile?.is_admin;
  const isBuyer = tx.buyer_id === userData.user.id;
  const isSeller = tx.seller_id === userData.user.id;

  if (!isBuyer && !isSeller && !isAdmin) {
    throw new Error(i18n.t('common:errors.unauthorized'));
  }

  const newStatus = patch.status as string | undefined;
  const currentStatus = tx.status as string;
  if (newStatus && newStatus !== currentStatus) {
    if (!canTransition(currentStatus, newStatus)) {
      throw new Error(`Cannot transition order from ${currentStatus} to ${newStatus}`);
    }
    const roleAllowed = (() => {
      if (isAdmin) return true;
      if (isSeller && newStatus === 'shipped' && currentStatus === 'paid_in_escrow') return true;
      if (isBuyer && newStatus === 'completed' && ['shipped', 'delivered'].includes(currentStatus)) return true;
      if (isBuyer && newStatus === 'delivered' && currentStatus === 'shipped') return true;
      if ((isBuyer || isSeller) && ['disputed', 'cancelled'].includes(newStatus)) return true;
      return false;
    })();
    if (!roleAllowed) {
      throw new Error(i18n.t('common:errors.unauthorized'));
    }
  }

  const allowedPatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => ALLOWED_ORDER_UPDATE_FIELDS.has(key))
  );
  if (Object.keys(allowedPatch).length === 0) {
    throw new Error('No valid order fields provided');
  }

  const { error } = await supabase.from('transactions').update(allowedPatch).eq('id', id);
  if (error) throw error;

  const localTx = TRANSACTIONS.find((t) => t.id === id);
  if (localTx) Object.assign(localTx, patch);
  invalidateTransactionDetail(id);
  invalidateUserQueries(tx.buyer_id as string);
  invalidateUserQueries(tx.seller_id as string);
  // Notify the buyer when their order is marked shipped.
  if (newStatus === 'shipped' && localTx) {
    const courier = (patch.courier as string | undefined) || localTx.courier || 'courier';
    notifyOrderShipped(localTx.buyer_id, id, courier);
  }
}

export async function markOrderDelivered(id: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(i18n.t('common:errors.unauthorized'));

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('id, buyer_id, seller_id, status')
    .eq('id', id)
    .single();
  if (txError || !tx) throw txError || new Error('Transaction not found');

  const profile = await fetchProfile(userData.user.id);
  const isSeller = tx.seller_id === userData.user.id;
  const isAdmin = !!profile?.is_admin;
  if (!isSeller && !isAdmin) {
    throw new Error('Only the seller can mark an order delivered');
  }

  if (tx.status !== 'shipped') {
    throw new Error('Only shipped orders can be marked delivered');
  }

  const deliveredAt = new Date().toISOString();
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'delivered', delivered_at: deliveredAt })
    .eq('id', id);
  if (error) throw error;
  const localTx = TRANSACTIONS.find((t) => t.id === id);
  if (localTx) {
    localTx.status = 'delivered';
    localTx.delivered_at = deliveredAt;
  }
  invalidateTransactionDetail(id);
  invalidateUserQueries(tx.buyer_id as string);
  invalidateUserQueries(tx.seller_id as string);
}

export async function getTransactionEvents(transactionId: string): Promise<TransactionEvent[]> {
  const { data, error } = await supabase
    .from('transaction_events')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id as string,
    transaction_id: r.transaction_id as string,
    actor_id: (r.actor_id as string | undefined) || undefined,
    event_type: r.event_type as TransactionEvent['event_type'],
    status_from: (r.status_from as TransactionStatus | undefined) || undefined,
    status_to: (r.status_to as TransactionStatus | undefined) || undefined,
    metadata: (r.metadata as Record<string, unknown>) || {},
    created_at: r.created_at as string,
    actor: USERS.find((u) => u.id === (r.actor_id as string | undefined)),
  }));
}

export async function updateListing(id: string, patch: Partial<NewListingInput>): Promise<Listing> {
  const { data, error } = await supabase.from('listings').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  const updated = await mapListing(data, profileCache);
  upsertById(LISTINGS, updated);
  invalidatePublicQueries();
  invalidateUserQueries(updated.seller_id);
  return updated;
}

export async function withdrawListing(id: string): Promise<void> {
  const { error } = await supabase.from('listings').update({ status: 'withdrawn' }).eq('id', id);
  if (error) throw error;
  const local = LISTINGS.find(l => l.id === id);
  if (local) {
    local.status = 'withdrawn';
    invalidatePublicQueries();
    invalidateUserQueries(local.seller_id);
  }
}

export async function markListingSold(id: string, sellerId: string, buyerId?: string): Promise<void> {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id, status, plant_id, price_thb')
    .eq('id', id)
    .single();
  if (listingError || !listing) throw listingError || new Error('Listing not found');

  const callerProfile = await fetchProfile(sellerId);
  const isOwner = listing.seller_id === sellerId;
  const isAdmin = !!callerProfile?.is_admin;
  if (!isOwner && !isAdmin) {
    throw new Error(i18n.t('common:errors.unauthorized'));
  }
  if (listing.status !== 'active') {
    throw new Error(i18n.t('checkout:errors.listingUnavailable'));
  }

  const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
  if (error) throw error;
  const local = LISTINGS.find(l => l.id === id);
  if (local) {
    local.status = 'sold';
    invalidatePublicQueries();
    invalidateUserQueries(local.seller_id);
  }
  // If a buyer is provided, record a manual transfer so provenance stays intact.
  if (buyerId && listing) {
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('id')
      .eq('id', (listing.plant_id as string | null) || '')
      .single();
    if (!plantError && plant) {
      await supabase.from('transfers').insert({
        plant_id: plant.id,
        from_user_id: listing.seller_id,
        to_user_id: buyerId,
        sale_price_thb: listing.price_thb,
        transferred_at: new Date().toISOString(),
      }).then(() => {});
      await supabase.from('plants').update({ current_owner_id: buyerId }).eq('id', plant.id).then(() => {});
    }
  }
}

export async function fetchPlant(plantId: string): Promise<Plant | null> {
  try {
    const { data, error } = await supabase.from('plants').select('*').eq('id', plantId).single();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      species_id: data.species_id as string,
      current_owner_id: data.current_owner_id as string,
      parent_plant_id: (data.parent_plant_id as string | undefined) || undefined,
      status: data.status as Plant['status'],
      qr_signature: data.qr_signature as string,
      created_at: data.created_at as string,
      species: getSpeciesById(data.species_id as string),
      current_owner: profileCache[data.current_owner_id as string] || USERS.find(u => u.id === data.current_owner_id),
    };
  } catch (e) {
    logger.warn('fetchPlant failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function fetchPlantTransfers(plantId: string): Promise<import('@/types').Transfer[]> {
  if (!isValidUuid(plantId)) return [];
  try {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('plant_id', plantId)
      .order('transferred_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id as string,
      plant_id: r.plant_id as string,
      from_user_id: r.from_user_id as string | undefined | null,
      to_user_id: r.to_user_id as string,
      transaction_id: r.transaction_id as string | undefined | null,
      sale_price_thb: (r.sale_price_thb as number | undefined) ?? undefined,
      transferred_at: r.transferred_at as string,
      from_user: profileCache[r.from_user_id as string] || USERS.find(u => u.id === r.from_user_id),
      to_user: profileCache[r.to_user_id as string] || USERS.find(u => u.id === r.to_user_id),
    }));
  } catch (e) {
    logger.warn('fetchPlantTransfers failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export async function recordQRScan(plantId: string, source: QRScan['scan_source'], scannerUserId?: string): Promise<void> {
  if (!isValidUuid(plantId)) return;
  try {
    await supabase.from('qr_scans').insert({
      plant_id: plantId,
      scanner_user_id: scannerUserId || null,
      scan_source: source,
    });
  } catch (e) {
    // Non-critical: don't block the scan experience.
    logger.warn('recordQRScan failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function fetchQRScans(plantId: string): Promise<QRScan[]> {
  if (!isValidUuid(plantId)) return [];
  try {
    const { data, error } = await supabase
      .from('qr_scans')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id as string,
      plant_id: r.plant_id as string,
      scanner_user_id: (r.scanner_user_id as string | undefined) || undefined,
      scan_source: r.scan_source as QRScan['scan_source'],
      ip_hash: (r.ip_hash as string | undefined) || undefined,
      user_agent_hash: (r.user_agent_hash as string | undefined) || undefined,
      created_at: r.created_at as string,
      scanner: profileCache[r.scanner_user_id as string] || USERS.find(u => u.id === r.scanner_user_id),
    }));
  } catch (e) {
    logger.warn('fetchQRScans failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function verifyQRSignature(plantId: string, signature: string): Promise<boolean> {
  if (!isValidUuid(plantId) || !signature) return false;
  try {
    const { data, error } = await supabase.rpc('verify_qr_signature', {
      p_plant_id: plantId,
      p_signature: signature,
    });
    if (error) throw error;
    return !!data;
  } catch (e) {
    logger.warn('verifyQRSignature failed', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const profiles = await fetchProfileMap();
    profileCache = { ...profileCache, ...profiles };
    return await mapListing(data, profiles);
  } catch (e) {
    logger.warn('fetchListingById failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function fetchListingByPlantId(plantId: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const profiles = await fetchProfileMap();
    profileCache = { ...profileCache, ...profiles };
    return await mapListing(data, profiles);
  } catch (e) {
    logger.warn('fetchListingByPlantId failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export async function fetchProvenance(
  plantId: string,
  signature?: string | null
): Promise<{ listing: Listing | null; transfers: import('@/types').Transfer[]; plant: Plant | null; scans: QRScan[]; signatureValid: boolean | null }> {
  const isUuid = isValidUuid(plantId);
  const listing = (await fetchListingByPlantId(plantId)) || getListingByPlantId(plantId) || null;
  const plant = isUuid ? await fetchPlant(plantId) : null;

  let signatureValid: boolean | null = null;
  if (plant && signature) {
    signatureValid = await verifyQRSignature(plantId, signature);
  }

  if (plant) {
    const [transfers, scans] = await Promise.all([
      fetchPlantTransfers(plantId),
      fetchQRScans(plantId),
    ]);
    return { listing, transfers, plant, scans, signatureValid };
  }

  // Legacy fallback: derive provenance from completed transactions when no
  // dedicated plants row exists (pre-migration listings).
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
    return { listing, transfers, plant: null, scans: [], signatureValid };
  } catch {
    return { listing, transfers: [], plant: null, scans: [], signatureValid };
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
  // Notify the counterparty (the side that did NOT open the dispute).
  const dtx = TRANSACTIONS.find(t => t.id === input.transaction_id);
  if (dtx) {
    const recipientId = input.opened_by === 'buyer' ? dtx.seller_id : dtx.buyer_id;
    notifyDisputeOpened(recipientId, input.transaction_id, input.transaction_id);
    invalidateUserQueries(dtx.buyer_id);
    invalidateUserQueries(dtx.seller_id);
  }
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const cleanPatch: Record<string, unknown> = {};
  if (patch.display_name !== undefined) cleanPatch.display_name = sanitizeText(patch.display_name, 50);
  if (patch.promptpay_id !== undefined) cleanPatch.promptpay_id = patch.promptpay_id ? sanitizeText(patch.promptpay_id, 20) : null;
  if (patch.language_preference !== undefined) cleanPatch.language_preference = patch.language_preference;
  if (patch.location !== undefined) cleanPatch.location = patch.location ? sanitizeText(patch.location, 50) : null;
  if (patch.avatar_url !== undefined) cleanPatch.avatar_url = patch.avatar_url;
  if (patch.updated_at !== undefined) cleanPatch.updated_at = patch.updated_at;

  const { error } = await supabase.from('profiles').update(cleanPatch).eq('id', userId);
  if (error) throw error;
  const user = USERS.find(u => u.id === userId);
  if (user) Object.assign(user, cleanPatch);
  queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
  invalidatePublicQueries();
}

/** Admin-only profile update. Persists strike/ban/admin flags and normal fields. */
export async function adminUpdateUser(userId: string, patch: Partial<Profile>): Promise<void> {
  const cleanPatch: Record<string, unknown> = {};
  if (patch.display_name !== undefined) cleanPatch.display_name = sanitizeText(patch.display_name, 50);
  if (patch.promptpay_id !== undefined) cleanPatch.promptpay_id = patch.promptpay_id ? sanitizeText(patch.promptpay_id, 20) : null;
  if (patch.language_preference !== undefined) cleanPatch.language_preference = patch.language_preference;
  if (patch.location !== undefined) cleanPatch.location = patch.location ? sanitizeText(patch.location, 50) : null;
  if (patch.avatar_url !== undefined) cleanPatch.avatar_url = patch.avatar_url;
  if (patch.is_banned !== undefined) cleanPatch.is_banned = patch.is_banned;
  if (patch.strike_count !== undefined) cleanPatch.strike_count = patch.strike_count;
  if (patch.is_admin !== undefined) cleanPatch.is_admin = patch.is_admin;
  cleanPatch.updated_at = new Date().toISOString();

  const { error } = await supabase.from('profiles').update(cleanPatch).eq('id', userId);
  if (error) throw error;
  const user = USERS.find(u => u.id === userId);
  if (user) Object.assign(user, cleanPatch);
  queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
  invalidatePublicQueries();
}

/** Ensure a profiles row exists for a freshly created user. This is a safety net
 *  when the Supabase `auth.users` -> `profiles` trigger is missing or delayed. */
export async function ensureProfile(
  userId: string,
  metadata: Record<string, unknown> = {}
): Promise<Profile | null> {
  try {
    const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (existing) {
      const patch: Record<string, unknown> = {};
      const displayName = String((metadata.display_name as string | undefined) ?? '').trim();
      if (displayName && !existing.display_name) patch.display_name = displayName;
      const promptpayId = String((metadata.promptpay_id as string | null | undefined) ?? '').trim();
      if (promptpayId && !existing.promptpay_id) patch.promptpay_id = promptpayId;
      const location = String((metadata.location as string | null | undefined) ?? '').trim();
      if (location && !existing.location) patch.location = location;
      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
        if (!error && data) {
          const merged = mapProfile(data);
          upsertById(USERS, merged);
          profileCache[merged.id] = merged;
          return merged;
        }
      }
      return mapProfile(existing);
    }
  } catch {
    // Table missing or RLS denied — fall through and try an insert.
  }

  const now = new Date().toISOString();
  const payload = {
    id: userId,
    display_name: String((metadata.display_name as string | undefined) ?? 'Plant Lover').trim() || 'Plant Lover',
    promptpay_id: (metadata.promptpay_id as string | null | undefined) ?? null,
    location: (metadata.location as string | null | undefined) ?? null,
    language_preference: (metadata.language_preference as 'th' | 'en' | undefined) ?? 'en',
    is_admin: false,
    strike_count: 0,
    is_banned: false,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase.from('profiles').insert(payload).select('*').single();
    if (error) throw error;
    if (data) {
      const mapped = mapProfile(data);
      upsertById(USERS, mapped);
      profileCache[mapped.id] = mapped;
      return mapped;
    }
  } catch (e) {
    logger.warn('ensureProfile insert failed', { error: e instanceof Error ? e.message : String(e) });
  }
  return null;
}

function mapWatchlistItem(r: DbRow): WatchlistItem {
  const type = r.watch_type as WatchType;
  const targetId = r.target_id as string;
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    watch_type: type,
    target_id: targetId,
    created_at: r.created_at as string,
    species: type === 'species' ? getSpeciesById(targetId) : undefined,
    listing: type === 'listing' ? getListingById(targetId) : undefined,
  };
}

export async function fetchUserWatchlist(userId: string): Promise<WatchlistItem[]> {
  try {
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => mapWatchlistItem(r));
  } catch (e) {
    logger.warn('fetchUserWatchlist failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export async function fetchSellerListings(sellerId: string): Promise<Listing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const profiles = await fetchProfileMap();
    profileCache = { ...profileCache, ...profiles };
    return await Promise.all((data || []).map((r) => mapListing(r, profiles)));
  } catch (e) {
    logger.warn('fetchSellerListings failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export function subscribeToWatchlist(userId: string): () => void {
  return ensureRealtimeChannel(`watchlist-${userId}`, () =>
    supabase
      .channel(`watchlist-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watchlist', filter: `user_id=eq.${userId}` },
        () => {
          invalidateUserQueries(userId);
          invalidatePublicQueries();
        }
      )
      .subscribe()
  );
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
  // Optimistically keep the local store in sync while realtime catches up.
  if (on) {
    if (!WATCHLIST.some(w => w.user_id === userId && w.watch_type === watchType && w.target_id === targetId)) {
      WATCHLIST.push({
        id: `opt-${userId}-${watchType}-${targetId}`,
        user_id: userId,
        watch_type: watchType,
        target_id: targetId,
        created_at: new Date().toISOString(),
        species: watchType === 'species' ? getSpeciesById(targetId) : undefined,
        listing: watchType === 'listing' ? getListingById(targetId) : undefined,
      });
    }
  } else {
    const idx = WATCHLIST.findIndex(w => w.user_id === userId && w.watch_type === watchType && w.target_id === targetId);
    if (idx >= 0) WATCHLIST.splice(idx, 1);
  }
  invalidateUserQueries(userId);
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
  invalidateUserQueries(local?.user_id || '');
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);
  if (error) logger.warn('markAllNotificationsRead failed', { error: error.message });
  NOTIFICATIONS.filter(n => n.user_id === userId).forEach(n => { n.read = true; });
  invalidateUserQueries(userId);
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) logger.warn('deleteNotification failed', { error: error.message });
  const idx = NOTIFICATIONS.findIndex(n => n.id === notificationId);
  if (idx >= 0) {
    const n = NOTIFICATIONS[idx];
    NOTIFICATIONS.splice(idx, 1);
    invalidateUserQueries(n.user_id);
  }
}

export async function createNotification(
  data: Omit<Notification, 'id' | 'created_at'>
): Promise<Notification> {
  const payload = { ...data, created_at: new Date().toISOString() };
  // Notifications are written FOR another user, and the RLS SELECT policy is
  // owner-only — so the inserter cannot read the row back. We insert without a
  // returning select (avoids a spurious "no rows" error) and keep a local copy
  // for any in-session UI; the recipient hydrates the real row on next load.
  const { error } = await supabase.from('notifications').insert(payload);
  if (error) {
    logger.warn('createNotification supabase insert failed, using local only', { error: error.message });
  }
  const notification: Notification = {
    id: `local-${crypto.randomUUID()}`,
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
    message: `Someone purchased your ${plantName} for ${amount.toLocaleString()} ${i18n.t('common:currency')}`,
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

export function notifyPaymentConfirmed(buyerId: string, orderId: string) {
  return createNotification({
    user_id: buyerId,
    type: 'order',
    title: 'Payment confirmed',
    message: 'The seller confirmed your payment. Your order is now protected by escrow.',
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
    message: `A buyer offered ${amount.toLocaleString()} ${i18n.t('common:currency')} for your ${listingName}`,
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

// ---------- realtime subscriptions ----------
// Single active channels per topic so repeated logins don't leak subscriptions.
const realtimeChannels: Record<string, ReturnType<typeof supabase.channel>> = {};

function ensureRealtimeChannel(key: string, builder: () => ReturnType<typeof supabase.channel>): () => void {
  if (realtimeChannels[key]) {
    supabase.removeChannel(realtimeChannels[key]);
  }
  const channel = builder();
  realtimeChannels[key] = channel;
  return () => {
    supabase.removeChannel(channel);
    if (realtimeChannels[key] === channel) delete realtimeChannels[key];
  };
}

export function subscribeToNotifications(userId: string): () => void {
  return ensureRealtimeChannel(`notifications-${userId}`, () =>
    supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          invalidateUserQueries(userId);
        }
      )
      .subscribe()
  );
}

export function subscribeToOffers(userId: string): () => void {
  return ensureRealtimeChannel(`offers-${userId}`, () =>
    supabase
      .channel(`offers-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `buyer_id=eq.${userId}` },
        () => { invalidateUserQueries(userId); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `seller_id=eq.${userId}` },
        () => { invalidateUserQueries(userId); }
      )
      .subscribe()
  );
}

export function subscribeToListings(): () => void {
  return ensureRealtimeChannel('listings-global', () =>
    supabase
      .channel('listings-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          invalidatePublicQueries();
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }
      )
      .subscribe()
  );
}

export function subscribeToPriceSnapshots(): () => void {
  return ensureRealtimeChannel('price-snapshots-global', () =>
    supabase
      .channel('price-snapshots-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'price_snapshots' },
        () => {
          bumpPriceSnapshots();
          queryClient.invalidateQueries({ queryKey: publicKeys.priceSnapshots(undefined, undefined) });
          queryClient.invalidateQueries({ queryKey: publicKeys.marketOverview() });
        }
      )
      .subscribe()
  );
}

export function subscribeToTransactions(userId: string): () => void {
  return ensureRealtimeChannel(`transactions-${userId}`, () =>
    supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `buyer_id=eq.${userId}` },
        (payload) => {
          invalidateUserQueries(userId);
          const changedId = (payload.new as { id?: string } | undefined)?.id;
          if (changedId) invalidateTransactionDetail(changedId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `seller_id=eq.${userId}` },
        (payload) => {
          invalidateUserQueries(userId);
          const changedId = (payload.new as { id?: string } | undefined)?.id;
          if (changedId) invalidateTransactionDetail(changedId);
        }
      )
      .subscribe()
  );
}

// ---------- seller reviews ----------
export function getSellerReviews(sellerId: string): SellerReview[] {
  return SELLER_REVIEWS.filter((r) => r.seller_id === sellerId && r.status === 'visible')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((r) => ({
      ...r,
      reviewer: USERS.find((u) => u.id === r.reviewer_id),
    }));
}

export function getSellerReviewStats(sellerId: string): { average: number; count: number; distribution: Record<number, number> } {
  const reviews = SELLER_REVIEWS.filter((r) => r.seller_id === sellerId && r.status === 'visible');
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

export function hasReviewedTransaction(transactionId: string, reviewerId: string): boolean {
  return SELLER_REVIEWS.some((r) => r.transaction_id === transactionId && r.reviewer_id === reviewerId);
}

export function canReviewSeller(userId: string | undefined, sellerId: string): { ok: boolean; transactionId?: string } {
  if (!userId) return { ok: false };
  const completed = TRANSACTIONS.find(
    (t) => t.buyer_id === userId && t.seller_id === sellerId && t.status === 'completed'
  );
  if (!completed) return { ok: false };
  if (hasReviewedTransaction(completed.id, userId)) return { ok: false };
  return { ok: true, transactionId: completed.id };
}

export async function createSellerReview(
  data: Omit<SellerReview, 'id' | 'created_at' | 'updated_at'>
): Promise<SellerReview> {
  const { data: row, error } = await supabase
    .from('seller_reviews')
    .insert({
      transaction_id: data.transaction_id,
      reviewer_id: data.reviewer_id,
      seller_id: data.seller_id,
      rating: data.rating,
      comment: data.comment ? sanitizeText(data.comment, 2000) : null,
      would_buy_again: data.would_buy_again ?? null,
      packaging_rating: data.packaging_rating ?? null,
      plant_condition_rating: data.plant_condition_rating ?? null,
      communication_rating: data.communication_rating ?? null,
      shipping_speed_rating: data.shipping_speed_rating ?? null,
      listing_accuracy_rating: data.listing_accuracy_rating ?? null,
      image_urls: data.image_urls || [],
    })
    .select('*')
    .single();
  if (error) throw error;
  const review = mapSellerReview(row);
  upsertById(SELLER_REVIEWS, review);
  // Update cached seller rating.
  const seller = USERS.find((u) => u.id === review.seller_id);
  if (seller) {
    const stats = getSellerReviewStats(review.seller_id);
    seller.rating = stats.average;
  }
  notifySellerReview(review.seller_id);
  invalidatePublicQueries();
  return review;
}

export function notifySellerReview(sellerId: string) {
  return createNotification({
    user_id: sellerId,
    type: 'review',
    title: 'New seller review',
    message: 'A buyer left a review on your profile.',
    link: `/seller/${sellerId}`,
    read: false,
  });
}

// ---------- community comments ----------
function mapComment(r: DbRow): Comment {
  return {
    id: r.id as string,
    species_id: r.species_id as string,
    listing_id: (r.listing_id as string | undefined) || undefined,
    parent_comment_id: (r.parent_comment_id as string | undefined) || undefined,
    author_id: r.author_id as string,
    content: r.content as string,
    content_type: (r.content_type as Comment['content_type'] | undefined) || 'text',
    likes_count: (r.likes_count as number | undefined) ?? 0,
    replies_count: (r.replies_count as number | undefined) ?? 0,
    status: (r.status as Comment['status'] | undefined) || 'visible',
    reported_count: (r.reported_count as number | undefined) ?? 0,
    admin_notes: (r.admin_notes as string | undefined) || undefined,
    edited_at: (r.edited_at as string | undefined) || undefined,
    edited_by: (r.edited_by as string | undefined) || undefined,
    deleted_at: (r.deleted_at as string | undefined) || undefined,
    deleted_by: (r.deleted_by as string | undefined) || undefined,
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string | undefined) || (r.created_at as string),
    author: USERS.find((u) => u.id === (r.author_id as string)),
  };
}

function mapCommentImage(r: DbRow): CommentImage {
  return {
    id: r.id as string,
    comment_id: r.comment_id as string,
    storage_bucket: r.storage_bucket as string,
    storage_path: r.storage_path as string,
    file_name: r.file_name as string,
    mime_type: r.mime_type as string,
    width: (r.width as number | undefined) ?? undefined,
    height: (r.height as number | undefined) ?? undefined,
    order_index: (r.order_index as number | undefined) ?? 0,
    created_at: r.created_at as string,
    url: supabase.storage.from(r.storage_bucket as string).getPublicUrl(r.storage_path as string).data.publicUrl,
  };
}

function mapCommentReaction(r: DbRow): CommentReaction {
  return {
    id: r.id as string,
    comment_id: r.comment_id as string,
    user_id: r.user_id as string,
    reaction: r.reaction as string,
    created_at: r.created_at as string,
    user: USERS.find((u) => u.id === (r.user_id as string)),
  };
}

const COMMENT_PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 10;

export function subscribeToComments(targetId: string, isListing: boolean): () => void {
  const key = `comments-${isListing ? 'listing' : 'species'}-${targetId}`;
  const filterField = isListing ? 'listing_id' : 'species_id';
  return ensureRealtimeChannel(key, () =>
    supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `${filterField}=eq.${targetId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            upsertById(COMMENTS, mapComment(payload.new as Record<string, unknown>));
          } else if (payload.eventType === 'UPDATE') {
            upsertById(COMMENTS, mapComment(payload.new as Record<string, unknown>));
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id;
            const idx = COMMENTS.findIndex((c) => c.id === id);
            if (idx >= 0) COMMENTS.splice(idx, 1);
          }
          queryClient.invalidateQueries({
            queryKey: isListing ? commentKeys.forListing(targetId) : commentKeys.forSpecies(targetId),
          });
        }
      )
      .subscribe()
  );
}

export function getCommentsForSpecies(
  speciesId: string,
  { cursor, limit = COMMENT_PAGE_SIZE }: { cursor?: string; limit?: number } = {}
): Comment[] {
  let comments = COMMENTS.filter(
    (c) => c.species_id === speciesId && !c.parent_comment_id && c.status === 'visible'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (cursor) {
    const idx = comments.findIndex((c) => c.id === cursor);
    if (idx >= 0) comments = comments.slice(idx + 1);
  }
  return comments.slice(0, limit).map((c) => hydrateCommentExtras(c));
}

export function getCommentReplies(
  parentId: string,
  { cursor, limit = REPLY_PAGE_SIZE }: { cursor?: string; limit?: number } = {}
): Comment[] {
  let replies = COMMENTS.filter(
    (c) => c.parent_comment_id === parentId && c.status === 'visible'
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (cursor) {
    const idx = replies.findIndex((c) => c.id === cursor);
    if (idx >= 0) replies = replies.slice(idx + 1);
  }
  return replies.slice(0, limit).map((c) => hydrateCommentExtras(c));
}

function hydrateCommentExtras(comment: Comment): Comment {
  const images = COMMENT_IMAGES.filter((i) => i.comment_id === comment.id).sort((a, b) => a.order_index - b.order_index);
  const reactions = COMMENT_REACTIONS.filter((r) => r.comment_id === comment.id);
  return {
    ...comment,
    images,
    reactions,
  };
}

export async function hydrateCommentsForSpecies(speciesId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('species_id', speciesId)
      .in('status', ['visible', 'under_review'])
      .order('created_at', { ascending: false })
      .limit(COMMENT_PAGE_SIZE * 2);
    if (error) throw error;
    COMMENTS.length = 0;
    (data || []).forEach((r) => upsertById(COMMENTS, mapComment(r)));
    await Promise.all([hydrateCommentImagesForSpecies(speciesId), hydrateCommentReactionsForSpecies(speciesId)]);
  } catch (e) {
    logger.warn('hydrateCommentsForSpecies failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

async function hydrateCommentImagesForSpecies(speciesId: string): Promise<void> {
  try {
    const commentIds = COMMENTS.filter((c) => c.species_id === speciesId).map((c) => c.id);
    if (commentIds.length === 0) return;
    const { data, error } = await supabase
      .from('comment_images')
      .select('*')
      .in('comment_id', commentIds)
      .order('order_index', { ascending: true });
    if (error) throw error;
    COMMENT_IMAGES.length = 0;
    (data || []).forEach((r) => COMMENT_IMAGES.push(mapCommentImage(r)));
  } catch (e) {
    logger.warn('hydrateCommentImagesForSpecies failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

async function hydrateCommentReactionsForSpecies(speciesId: string): Promise<void> {
  try {
    const commentIds = COMMENTS.filter((c) => c.species_id === speciesId).map((c) => c.id);
    if (commentIds.length === 0) return;
    const { data, error } = await supabase
      .from('comment_reactions')
      .select('*')
      .in('comment_id', commentIds);
    if (error) throw error;
    COMMENT_REACTIONS.length = 0;
    (data || []).forEach((r) => COMMENT_REACTIONS.push(mapCommentReaction(r)));
  } catch (e) {
    logger.warn('hydrateCommentReactionsForSpecies failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export function getCommentsForListing(
  listingId: string,
  { cursor, limit = COMMENT_PAGE_SIZE }: { cursor?: string; limit?: number } = {}
): Comment[] {
  let comments = COMMENTS.filter(
    (c) => c.listing_id === listingId && !c.parent_comment_id && c.status === 'visible'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (cursor) {
    const idx = comments.findIndex((c) => c.id === cursor);
    if (idx >= 0) comments = comments.slice(idx + 1);
  }
  return comments.slice(0, limit).map((c) => hydrateCommentExtras(c));
}

export async function hydrateCommentsForListing(listingId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('listing_id', listingId)
      .in('status', ['visible', 'under_review'])
      .order('created_at', { ascending: false })
      .limit(COMMENT_PAGE_SIZE * 2);
    if (error) throw error;
    (data || []).forEach((r) => upsertById(COMMENTS, mapComment(r)));
    await Promise.all([hydrateCommentImagesForListing(listingId), hydrateCommentReactionsForListing(listingId)]);
  } catch (e) {
    logger.warn('hydrateCommentsForListing failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

async function hydrateCommentImagesForListing(listingId: string): Promise<void> {
  try {
    const commentIds = COMMENTS.filter((c) => c.listing_id === listingId).map((c) => c.id);
    if (commentIds.length === 0) return;
    const { data, error } = await supabase
      .from('comment_images')
      .select('*')
      .in('comment_id', commentIds)
      .order('order_index', { ascending: true });
    if (error) throw error;
    (data || []).forEach((r) => upsertById(COMMENT_IMAGES, mapCommentImage(r)));
  } catch (e) {
    logger.warn('hydrateCommentImagesForListing failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

async function hydrateCommentReactionsForListing(listingId: string): Promise<void> {
  try {
    const commentIds = COMMENTS.filter((c) => c.listing_id === listingId).map((c) => c.id);
    if (commentIds.length === 0) return;
    const { data, error } = await supabase
      .from('comment_reactions')
      .select('*')
      .in('comment_id', commentIds);
    if (error) throw error;
    (data || []).forEach((r) => upsertById(COMMENT_REACTIONS, mapCommentReaction(r)));
  } catch (e) {
    logger.warn('hydrateCommentReactionsForListing failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export interface CreateCommentInput {
  species_id?: string;
  listing_id?: string;
  parent_comment_id?: string;
  content: string;
  images?: { storage_bucket: string; storage_path: string; file_name: string; mime_type: string; width?: number; height?: number }[];
}

export async function createComment(
  input: CreateCommentInput,
  authorId: string
): Promise<Comment> {
  if (!input.species_id && !input.listing_id) {
    throw new Error('Comment must be attached to a species or a listing');
  }
  const content = sanitizeText(input.content, 5000);
  const mentions = parseMentions(content);
  const { data: row, error } = await supabase
    .from('comments')
    .insert({
      species_id: input.species_id || null,
      listing_id: input.listing_id || null,
      parent_comment_id: input.parent_comment_id || null,
      author_id: authorId,
      content,
    })
    .select('*')
    .single();
  if (error) throw error;
  const comment = mapComment(row);

  // Insert images.
  if (input.images && input.images.length > 0) {
    const imageRows = input.images.map((img, i) => ({
      comment_id: comment.id,
      storage_bucket: img.storage_bucket,
      storage_path: img.storage_path,
      file_name: img.file_name,
      mime_type: img.mime_type,
      width: img.width,
      height: img.height,
      order_index: i,
    }));
    const { data: imageData, error: imageError } = await supabase
      .from('comment_images')
      .insert(imageRows)
      .select('*');
    if (!imageError && imageData) {
      imageData.forEach((r) => COMMENT_IMAGES.push(mapCommentImage(r)));
    }
  }

  // Insert mentions.
  if (mentions.length > 0) {
    const mentionRows = mentions.map((m) => ({ comment_id: comment.id, mentioned_user_id: m.userId }));
    await supabase.from('comment_mentions').insert(mentionRows).then(() => {});
  }

  upsertById(COMMENTS, comment);
  return hydrateCommentExtras(comment);
}

export async function editComment(id: string, authorId: string, content: string): Promise<Comment> {
  const sanitized = sanitizeText(content, 5000);
  const { data: row, error } = await supabase
    .from('comments')
    .update({ content: sanitized, edited_at: new Date().toISOString(), edited_by: authorId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const comment = mapComment(row);
  upsertById(COMMENTS, comment);
  return hydrateCommentExtras(comment);
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  const local = COMMENTS.find((c) => c.id === id);
  if (local) local.deleted_at = new Date().toISOString();
}

export async function toggleCommentReaction(
  commentId: string,
  userId: string,
  reaction: string = 'like'
): Promise<{ added: boolean }> {
  const existing = COMMENT_REACTIONS.find(
    (r) => r.comment_id === commentId && r.user_id === userId && r.reaction === reaction
  );
  if (existing) {
    const { error } = await supabase.from('comment_reactions').delete().eq('id', existing.id);
    if (error) throw error;
    const idx = COMMENT_REACTIONS.findIndex((r) => r.id === existing.id);
    if (idx >= 0) COMMENT_REACTIONS.splice(idx, 1);
    return { added: false };
  }
  const { data: row, error } = await supabase
    .from('comment_reactions')
    .insert({ comment_id: commentId, user_id: userId, reaction })
    .select('*')
    .single();
  if (error) throw error;
  COMMENT_REACTIONS.push(mapCommentReaction(row));
  return { added: true };
}

export async function reportComment(
  commentId: string,
  reportedBy: string,
  reason: string,
  details?: string
): Promise<void> {
  const { error } = await supabase.from('comment_reports').insert({
    comment_id: commentId,
    reported_by: reportedBy,
    reason: sanitizeText(reason, 100),
    details: details ? sanitizeText(details, 1000) : null,
  });
  if (error) throw error;
  const comment = COMMENTS.find((c) => c.id === commentId);
  if (comment) comment.reported_count += 1;
}

export async function ensureCommentImageBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === 'comment-images');
    if (!exists) {
      await supabase.storage.createBucket('comment-images', {
        public: true,
        fileSizeLimit: 5242880,
      });
    }
  } catch (e) {
    logger.warn('ensureCommentImageBucket failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function uploadUserImage(file: File, userId: string): Promise<{ storage_path: string; width?: number; height?: number }> {
  const validation = validateImageFile(file, 5);
  if (!validation.ok) throw new Error(validation.error);
  await ensureCommentImageBucket();
  const ext = file.type.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('comment-images').upload(path, file, { upsert: false });
  if (error) throw error;
  return { storage_path: path };
}

function parseMentions(content: string): { userId: string; displayName: string }[] {
  const mentionRegex = /@([^\s@]+)/g;
  const matches = content.matchAll(mentionRegex);
  const result: { userId: string; displayName: string }[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    const handle = match[1].toLowerCase();
    const user = USERS.find(
      (u) =>
        u.display_name.toLowerCase().replace(/\s+/g, '') === handle ||
        u.display_name.toLowerCase().replace(/\s+/g, '_') === handle
    );
    if (user && !seen.has(user.id)) {
      seen.add(user.id);
      result.push({ userId: user.id, displayName: user.display_name });
    }
  }
  return result;
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
  // Open a conversation thread for the offer first so the DB row can store it.
  let conversationId: string | undefined;
  try {
    const conv = await getOrCreateDirectConversation(data.buyer_id, data.seller_id, data.listing_id);
    conversationId = conv.id;
  } catch (e) {
    logger.warn('createOffer could not open conversation', { error: e instanceof Error ? e.message : String(e) });
  }

  // Insert and read back so the local copy uses the DB-generated id — otherwise
  // a later hydrate would duplicate the offer under a different id, and
  // respond/withdraw (which match by id) would target the wrong row.
  const insert: Record<string, unknown> = {
    listing_id: data.listing_id,
    buyer_id: data.buyer_id,
    seller_id: data.seller_id,
    offer_price_thb: data.offer_price_thb,
    message: data.message || null,
    status: 'pending',
  };
  if (conversationId) insert.conversation_id = conversationId;

  const { data: row, error } = await supabase
    .from('offers')
    .insert(insert)
    .select('*')
    .single();
  if (error) {
    logger.warn('createOffer supabase failed, using local only', { error: error.message });
  }
  const offer: Offer = row
    ? mapOffer(row)
    : {
        ...data,
        id: `o-${crypto.randomUUID().slice(0, 8)}`,
        status: 'pending',
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
      };
  upsertById(OFFERS, offer);

  // Seed the chat with the offer details.
  if (conversationId) {
    try {
      const currency = 'THB';
      const offerText = data.message?.trim()
        ? `Offer: ${data.offer_price_thb.toLocaleString()} ${currency} — ${data.message.trim()}`
        : `Offer: ${data.offer_price_thb.toLocaleString()} ${currency}`;
      await sendMessageV2({
        conversationId,
        senderId: data.buyer_id,
        content: offerText,
        listingId: data.listing_id,
      });
    } catch (e) {
      logger.warn('createOffer could not seed chat message', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  const offerListingName = LISTINGS.find(l => l.id === data.listing_id)?.species?.common_name_en || 'plant';
  notifyOfferReceived(data.seller_id, offer.id, offerListingName, data.offer_price_thb);
  invalidateUserQueries(data.buyer_id);
  invalidateUserQueries(data.seller_id);
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
  invalidateUserQueries(offer.buyer_id);
  invalidateUserQueries(offer.seller_id);
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
  invalidateUserQueries(offer.buyer_id);
  invalidateUserQueries(offer.seller_id);
}

// ---------- price alerts ----------
export function getUserPriceAlerts(userId: string): PriceAlert[] {
  return PRICE_ALERTS.filter(pa => pa.user_id === userId).map(pa => ({
    ...pa,
    species: getSpeciesById(pa.species_id),
  }));
}

export async function createPriceAlert(
  data: Omit<PriceAlert, 'id' | 'created_at'>
): Promise<PriceAlert> {
  // Insert and read back so the local copy uses the DB-generated id — otherwise
  // a later hydrate duplicates the alert and delete (matched by id) misses.
  const { data: row, error } = await supabase
    .from('price_alerts')
    .insert({
      user_id: data.user_id,
      species_id: data.species_id,
      size_category: data.size_category || null,
      threshold_thb: data.threshold_thb,
      direction: data.direction,
    })
    .select('*')
    .single();
  if (error) {
    logger.warn('createPriceAlert supabase failed, using local only', { error: error.message });
  }
  const alert: PriceAlert = row
    ? mapPriceAlert(row)
    : { ...data, id: `pa-${crypto.randomUUID().slice(0, 8)}`, created_at: new Date().toISOString() };
  upsertById(PRICE_ALERTS, alert);
  invalidateUserQueries(data.user_id);
  return alert;
}

export async function deletePriceAlert(alertId: string): Promise<void> {
  const { error } = await supabase.from('price_alerts').delete().eq('id', alertId);
  if (error) {
    logger.warn('deletePriceAlert supabase failed, using local only', { error: error.message });
  }
  const idx = PRICE_ALERTS.findIndex(pa => pa.id === alertId);
  if (idx >= 0) {
    const alert = PRICE_ALERTS[idx];
    PRICE_ALERTS.splice(idx, 1);
    invalidateUserQueries(alert.user_id);
  }
}

export function checkPriceAlerts(speciesId: string, currentPrice: number): PriceAlert[] {
  return PRICE_ALERTS.filter(pa => {
    if (pa.species_id !== speciesId) return false;
    if (pa.direction === 'below') return currentPrice <= pa.threshold_thb;
    return currentPrice >= pa.threshold_thb;
  });
}

// Backward-compatible sendMessage wrapper that routes to the new conversation-based implementation.
interface LegacySendMessageInput {
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  listing_id?: string;
  content: string;
  flagged_contact_info: boolean;
}

export async function sendMessage(data: LegacySendMessageInput): Promise<import('@/types').Message> {
  const parts = data.thread_id.split('_');
  let conversationId = data.thread_id;

  // Legacy thread ids have the shape thread_user1_user2_listing|general.
  // Map them to a real conversation.
  if (parts.length === 4 && parts[0] === 'thread') {
    const otherUserId = parts[1] === data.sender_id ? parts[2] : parts[1];
    const listingId = parts[3] === 'general' ? undefined : parts[3];
    const conversation = await getOrCreateDirectConversation(data.sender_id, otherUserId, listingId);
    conversationId = conversation.id;
  }

  return sendMessageV2({
    conversationId,
    senderId: data.sender_id,
    content: data.content,
    listingId: data.listing_id,
  });
}

export interface ContactEmailInput {
  name: string;
  email: string;
  topic: string;
  message: string;
  userId?: string | null;
}

export async function sendContactEmail(input: ContactEmailInput): Promise<void> {
  const { error } = await supabase.functions.invoke('send-contact-email', {
    body: {
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
      userId: input.userId ?? null,
    },
  });
  if (error) {
    logger.error('sendContactEmail failed', new Error(error.message));
    throw new Error(error.message || 'Failed to send contact message');
  }
}

export { SPECIES };
