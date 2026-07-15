import type {
  Species, Profile, Listing, Transaction, Transfer, PriceSnapshot,
  Message, Dispute, WatchlistItem, PriceAlert, MarketOverview, DashboardStats,
  ProvenanceChain, SellerReview, Comment, CommentImage, CommentReaction,
  CommentMention, CommentReport, Notification, Offer, TrendingSpecies,
  Conversation, ConversationParticipant, MessageAttachment, MessageReaction,
  MessageRead, MessageReport, UserPresence, EmailQueueItem
} from '@/types';
import { ALL_SPECIES } from './speciesDatabase';

export const SPECIES: Species[] = [
  { id: 'sp-1', scientific_name: 'Monstera deliciosa \'Thai Constellation\'', common_name_th: 'มอนสเตอร่าไทยคอนสเตอเลชัน', common_name_en: 'Thai Constellation Monstera', synonyms: ['Monstera Thai Const'], category: 'aroid', created_at: '2023-01-01', description: 'Rare variegated Monstera with creamy white constellation-like patterns', care_level: 'moderate', light_requirement: 'Bright indirect' },
  { id: 'sp-2', scientific_name: 'Philodendron erubescens \'Pink Princess\'', common_name_th: 'ฟิโลเดนดรอนพิ้งค์ปริ้นเซส', common_name_en: 'Pink Princess Philodendron', synonyms: ['PPP'], category: 'aroid', created_at: '2023-01-01', description: 'Stunning pink variegated philodendron', care_level: 'moderate', light_requirement: 'Bright indirect' },
  { id: 'sp-3', scientific_name: 'Hoya carnosa', common_name_th: 'ฮอยย่านภาคพื้นสมุทร', common_name_en: 'Wax Plant', synonyms: ['Hoya Tricolor'], category: 'hoya', created_at: '2023-01-01', description: 'Classic trailing Hoya with fragrant flowers', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-4', scientific_name: 'Anthurium clarinervium', common_name_th: 'หน้าวัวใบหัวใจ', common_name_en: 'Velvet Cardboard Anthurium', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Heart-shaped dark leaves with white veins', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-5', scientific_name: 'Epipremnum aureum \'Marble Queen\'', common_name_th: 'พอทอสมาร์เบิ้ลควีน', common_name_en: 'Marble Queen Pothos', synonyms: ['Devils Ivy Marble'], category: 'aroid', created_at: '2023-01-01', description: 'Easy-care trailing plant with cream variegation', care_level: 'easy', light_requirement: 'Low to bright' },
  { id: 'sp-6', scientific_name: 'Dracaena trifasciata', common_name_th: 'ลิ้นมังกร', common_name_en: 'Snake Plant', synonyms: ['Sansevieria', "Mother-in-law's Tongue"], category: 'succulent', created_at: '2023-01-01', description: 'Nearly indestructible upright succulent', care_level: 'easy', light_requirement: 'Low to bright' },
  { id: 'sp-7', scientific_name: 'Asplenium nidus', common_name_th: 'เฟิร์นข้าหลวง', common_name_en: "Bird's Nest Fern", synonyms: [], category: 'fern', created_at: '2023-01-01', description: 'Bright green wavy fronds in rosette form', care_level: 'moderate', light_requirement: 'Medium indirect' },
  { id: 'sp-8', scientific_name: 'Zamioculcas zamiifolia', common_name_th: 'กวักมรกต', common_name_en: 'ZZ Plant', synonyms: ['Zanzibar Gem'], category: 'aroid', created_at: '2023-01-01', description: 'Glossy dark green leaves, extremely hardy', care_level: 'easy', light_requirement: 'Low to bright' },
  { id: 'sp-9', scientific_name: 'Hoya kerrii', common_name_th: 'ฮอย่าใจ', common_name_en: 'Sweetheart Hoya', synonyms: ['Valentine Hoya'], category: 'hoya', created_at: '2023-01-01', description: 'Heart-shaped leaves, perfect gift plant', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-10', scientific_name: 'Philodendron gloriosum', common_name_th: 'ฟิโลเดนดรอนกลอริโอซัม', common_name_en: 'Gloriosum Philodendron', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Velvety dark green heart leaves with white veins', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-11', scientific_name: 'Monstera deliciosa \'Albo Borsigiana\'', common_name_th: 'มอนสเตอร่าอัลโบ', common_name_en: 'Monstera Albo', synonyms: ['Monstera Albo Variegata'], category: 'aroid', created_at: '2023-01-01', description: 'Half-moon white variegated Monstera', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-12', scientific_name: 'Echeveria elegans', common_name_th: 'อีเชเวอเรีย', common_name_en: 'Mexican Snowball', synonyms: [], category: 'succulent', created_at: '2023-01-01', description: 'Rosette-forming pastel succulent', care_level: 'easy', light_requirement: 'Bright direct' },
  { id: 'sp-13', scientific_name: 'Spathiphyllum wallisii', common_name_th: 'หน้าวัวใบ', common_name_en: 'Peace Lily', synonyms: ['White Sails'], category: 'aroid', created_at: '2023-01-01', description: 'Elegant white flowers, air purifier', care_level: 'easy', light_requirement: 'Low to medium' },
  { id: 'sp-14', scientific_name: 'Anthurium crystallinum', common_name_th: 'หน้าวัวคริสตัล', common_name_en: 'Crystal Anthurium', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Silver crystalline veins on velvet leaves', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-15', scientific_name: 'Philodendron melanochrysum', common_name_th: 'ฟิโลเดนดรอนเมลาโน', common_name_en: 'Black Gold Philodendron', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Velvety bronze-green with golden venation', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-16', scientific_name: 'Chlorophytum comosum', common_name_th: 'เศรษฐีเรือนใน', common_name_en: 'Spider Plant', synonyms: ['Airplane Plant'], category: 'other', created_at: '2023-01-01', description: 'Variegated arching leaves with baby plantlets', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-17', scientific_name: 'Hoya pubicalyx', common_name_th: 'ฮอย่าพับบิคาลิกซ์', common_name_en: 'Hoya Pubicalyx', synonyms: ['Splash Hoya'], category: 'hoya', created_at: '2023-01-01', description: 'Silver-splashed leaves, pink star flowers', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-18', scientific_name: 'Alocasia amazonica \'Polly\'', common_name_th: 'อะโลคาเซียโพลลี่', common_name_en: 'African Mask Plant', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Arrowhead leaves with striking white veins', care_level: 'moderate', light_requirement: 'Bright indirect' },
  { id: 'sp-19', scientific_name: 'Ctenanthe burle-marxii', common_name_th: 'คเทนันเท้', common_name_en: 'Fishbone Prayer Plant', synonyms: ['Never Never Plant'], category: 'other', created_at: '2023-01-01', description: 'Silver-green striped leaves with purple undersides', care_level: 'moderate', light_requirement: 'Medium indirect' },
  { id: 'sp-20', scientific_name: 'Philodendron erubescens \'White Princess\'', common_name_th: 'ฟิโลเดนดรอนไวท์ปริ้นเซส', common_name_en: 'White Princess Philodendron', synonyms: ['PWP'], category: 'aroid', created_at: '2023-01-01', description: 'White and pink variegated beauty', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-21', scientific_name: 'Ficus lyrata', common_name_th: 'ไทรใบสัก', common_name_en: 'Fiddle Leaf Fig', synonyms: [], category: 'other', created_at: '2023-01-01', description: 'Large violin-shaped glossy leaves', care_level: 'moderate', light_requirement: 'Bright indirect' },
];

export const PLANT_IMAGES: Record<string, string> = {
  'sp-1': '/images/plants/monstera-thai.jpg',
  'sp-2': '/images/plants/pink-princess.jpg',
  'sp-3': '/images/plants/hoya-carnosa.jpg',
  'sp-4': '/images/plants/anthurium-clarinervium.jpg',
  'sp-5': '/images/plants/pothos-marble.jpg',
  'sp-6': '/images/plants/snake-plant.jpg',
  'sp-7': '/images/plants/birds-nest-fern.jpg',
  'sp-8': '/images/plants/zz-plant.jpg',
  'sp-9': '/images/plants/hoya-kerrii.jpg',
  'sp-10': '/images/plants/philodendron-gloriosum.jpg',
  'sp-11': '/images/plants/monstera-albo.jpg',
  'sp-12': '/images/plants/succulent-collection.jpg',
  'sp-13': '/images/plants/peace-lily.jpg',
  'sp-14': '/images/plants/anthurium-crystallinum.jpg',
  'sp-15': '/images/plants/philodendron-melanochrysum.jpg',
  'sp-16': '/images/plants/spider-plant.jpg',
  'sp-17': '/images/plants/hoya-pubicalyx.jpg',
  'sp-18': '/images/plants/alocasia-polly.jpg',
  'sp-19': '/images/plants/ctenanthe.jpg',
  'sp-20': '/images/plants/philodendron-white-princess.jpg',
  'sp-21': '/images/plants/fiddle-leaf-fig.jpg',
};

// Real sellers are loaded from Supabase `profiles` at boot (see lib/api.ts).
export const USERS: Profile[] = [];

// Real listings are loaded from Supabase `listings` at boot (see lib/api.ts).
export const LISTINGS: Listing[] = [];

// All marketplace activity below is loaded from Supabase at boot (see lib/api.ts).
// These start empty so the app only ever shows real users, listings and orders.
export const TRANSACTIONS: Transaction[] = [];

export const TRANSFERS: Transfer[] = [];

export const DISPUTES: Dispute[] = [];

export const MESSAGES: Message[] = [];

export const CONVERSATIONS: Conversation[] = [];

export const CONVERSATION_PARTICIPANTS: ConversationParticipant[] = [];

export const MESSAGE_ATTACHMENTS: MessageAttachment[] = [];

export const MESSAGE_REACTIONS: MessageReaction[] = [];

export const MESSAGE_READS: MessageRead[] = [];

export const MESSAGE_REPORTS: MessageReport[] = [];

export const USER_PRESENCE: UserPresence[] = [];

export const EMAIL_QUEUE: EmailQueueItem[] = [];

export const WATCHLIST: WatchlistItem[] = [];

export const PRICE_ALERTS: PriceAlert[] = [];

export const SELLER_REVIEWS: SellerReview[] = [];

export const COMMENTS: Comment[] = [];

export const COMMENT_IMAGES: CommentImage[] = [];

export const COMMENT_REACTIONS: CommentReaction[] = [];

export const COMMENT_MENTIONS: CommentMention[] = [];

export const COMMENT_REPORTS: CommentReport[] = [];

export const NOTIFICATIONS: Notification[] = [];

export const OFFERS: Offer[] = [];

// Price history is derived from real completed sales once they exist. Until the
// marketplace has live trade data there are no snapshots to show.
export const PRICE_SNAPSHOTS: PriceSnapshot[] = [];

// External store for price snapshots so market charts update live.
let priceSnapshotsVersion = 0;
const priceSnapshotListeners = new Set<() => void>();
export function bumpPriceSnapshots() {
  priceSnapshotsVersion++;
  priceSnapshotListeners.forEach((l) => l());
}
export function subscribePriceSnapshots(cb: () => void): () => void {
  priceSnapshotListeners.add(cb);
  return () => { priceSnapshotListeners.delete(cb); };
}
export function getPriceSnapshotsVersion(): number {
  return priceSnapshotsVersion;
}

export function getPriceSnapshotsForSpecies(speciesId: string, sizeCategory?: string, days: number = 90): PriceSnapshot[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return PRICE_SNAPSHOTS.filter(ps =>
    ps.species_id === speciesId &&
    (sizeCategory ? ps.size_category === sizeCategory : ps.size_category == null) &&
    new Date(ps.snapshot_date) >= cutoff
  ).sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
}

export function getSpeciesPriceStats(speciesId: string, days: number = 30) {
  const data = getPriceSnapshotsForSpecies(speciesId, undefined, days);
  if (data.length === 0) {
    // No sales history yet — derive a live market estimate from active listings
    // so the market page and seller price suggestions are useful immediately.
    const live = getActiveListings({ speciesId });
    if (live.length === 0) return null;
    const prices = live.map(l => l.price_thb).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    return { median, mean, min: prices[0], max: prices[prices.length - 1], totalSales: 0 };
  }
  const prices = data.map(d => d.median_price_thb);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const totalSales = data.reduce((s, d) => s + d.sale_count, 0);
  return { median, mean, min, max, totalSales };
}

export function getMarketOverview(): MarketOverview {
  // Derived from real snapshots plus active listings so the market page is
  // useful even before many sales have completed.
  const speciesIds: string[] = Array.from(new Set([
    ...PRICE_SNAPSHOTS.map(s => s.species_id),
    ...LISTINGS.filter(l => l.status === 'active' && l.species?.id).map(l => l.species!.id),
  ]));

  const allStats: TrendingSpecies[] = speciesIds.map(sid => {
    const last30 = getSpeciesPriceStats(sid, 30);
    const prev60to30 = getPriceSnapshotsForSpecies(sid, undefined, 60).slice(0, 30);
    const prevMedian = prev60to30.length > 0
      ? Math.round(prev60to30.reduce((s, p) => s + p.median_price_thb, 0) / prev60to30.length)
      : (last30?.median || 0);
    const sales30d = last30?.totalSales || 0;
    const sparkline = getPriceSnapshotsForSpecies(sid, undefined, 30).map(d => d.median_price_thb);
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
  }).filter((s): s is TrendingSpecies => !!s);

  const trending_up = allStats
    .filter(s => s.percent_change > 5)
    .sort((a, b) => b.percent_change - a.percent_change)
    .slice(0, 5);

  const trending_down = allStats
    .filter(s => s.percent_change < -3)
    .sort((a, b) => a.percent_change - b.percent_change)
    .slice(0, 4);

  const most_traded = [...allStats]
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 4);

  const hot_right_now = allStats
    .filter(s => s.percent_change > 2)
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5);

  const cold = allStats
    .filter(s => s.percent_change < -2)
    .sort((a, b) => a.percent_change - b.percent_change)
    .slice(0, 4);

  return {
    trending_up,
    trending_down,
    most_traded,
    high_value_sales: TRANSACTIONS.filter(t => t.status === 'completed' && t.sale_price_thb >= 5000),
    hot_right_now,
    cold,
  };
}

export function getMarketSpecies(): Species[] {
  const ids = new Set<string>();
  ALL_SPECIES.forEach(s => ids.add(s.id));
  LISTINGS.forEach(l => { if (l.species?.id) ids.add(l.species.id); });
  TRANSACTIONS.forEach(t => { if (t.listing?.species?.id) ids.add(t.listing.species.id); });
  return Array.from(ids).map(id => getSpeciesById(id)).filter((s): s is Species => !!s);
}

export function getSpeciesDisplayName(species?: Species): string {
  if (!species) return 'Unknown plant';
  return species.scientific_name || species.common_name_en || species.common_name_th || 'Unknown plant';
}

export function getDashboardStats(): DashboardStats {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const gmvSince = (ms: number) =>
    TRANSACTIONS
      .filter(t => now - new Date(t.created_at).getTime() <= ms)
      .reduce((sum, t) => sum + (t.sale_price_thb || 0), 0);
  const completed = TRANSACTIONS.filter(t => t.status === 'completed').length;
  const disputed = TRANSACTIONS.filter(t => t.status === 'disputed').length;
  return {
    gmv_today: gmvSince(DAY),
    gmv_week: gmvSince(7 * DAY),
    gmv_month: gmvSince(30 * DAY),
    active_listings: LISTINGS.filter(l => l.status === 'active').length,
    dispute_rate: completed > 0 ? Math.round((disputed / completed) * 1000) / 10 : 0,
    user_count: USERS.length,
    pending_disputes: DISPUTES.filter(d => d.status === 'open').length,
    pending_payouts: TRANSACTIONS.filter(t => t.status === 'delivered').length,
  };
}

export function getProvenanceChain(plantId: string): ProvenanceChain | null {
  const plantTransfers = TRANSFERS.filter(tr => tr.plant_id === plantId);
  if (plantTransfers.length === 0) return null;
  const plant = { id: plantId, species_id: 'sp-1', current_owner_id: 'u-1', status: 'active' as const, created_at: '2023-06-01', qr_signature: 'abc123' };
  return {
    plant,
    transfers: plantTransfers,
    total_owners: new Set(plantTransfers.map(t => t.to_user_id)).size,
    total_sales_value: plantTransfers.reduce((sum, t) => sum + (t.sale_price_thb || 0), 0),
    origin_date: plantTransfers[0]?.transferred_at || '2023-06-01'
  };
}

export function getListingsWithDetails(): Listing[] {
  return LISTINGS.map(l => ({
    ...l,
    species: l.species,
    seller: l.seller || USERS.find(u => u.id === l.seller_id),
    photos: l.photos && l.photos.length ? l.photos : [{ id: `lp-${l.id}`, listing_id: l.id, storage_path: PLANT_IMAGES[l.species?.id || ''] || '/images/plants/monstera-thai.jpg', order_index: 0, created_at: l.created_at }]
  }));
}

export function getTransactionsWithDetails(): Transaction[] {
  return TRANSACTIONS.map(t => ({
    ...t,
    buyer: t.buyer || USERS.find(u => u.id === t.buyer_id),
    seller: t.seller || USERS.find(u => u.id === t.seller_id),
    listing: t.listing,
  }));
}

export function getListingById(id: string): Listing | undefined {
  return getListingsWithDetails().find(l => l.id === id);
}

export function getSpeciesById(id: string): Species | undefined {
  const fromCatalog = SPECIES.find(s => s.id === id);
  if (fromCatalog) return fromCatalog;
  const fromAll = ALL_SPECIES.find(s => s.id === id);
  if (!fromAll) return undefined;
  return {
    id: fromAll.id,
    scientific_name: fromAll.scientific_name,
    common_name_th: fromAll.common_name_th,
    common_name_en: fromAll.common_name_en,
    synonyms: fromAll.synonyms,
    category: fromAll.category as Species['category'],
    created_at: '2023-01-01',
  };
}

export function getUserById(id: string): Profile | undefined {
  return USERS.find(u => u.id === id);
}

export function getTransactionById(id: string): Transaction | undefined {
  return getTransactionsWithDetails().find(t => t.id === id);
}

export function getListingByPlantId(plantId: string): Listing | undefined {
  return getListingsWithDetails().find(l => l.plant_id === plantId);
}

export function getActiveListings(filters?: { speciesId?: string; category?: string; minPrice?: number; maxPrice?: number; size?: string; province?: string }): Listing[] {
  let listings = getListingsWithDetails().filter(l => l.status === 'active');
  if (filters?.speciesId) listings = listings.filter(l => l.species?.id === filters.speciesId);
  if (filters?.category) listings = listings.filter(l => l.species?.category === filters.category);
  if (filters?.minPrice) listings = listings.filter(l => l.price_thb >= filters.minPrice!);
  if (filters?.maxPrice) listings = listings.filter(l => l.price_thb <= filters.maxPrice!);
  if (filters?.size) listings = listings.filter(l => l.size_category === filters.size);
  if (filters?.province) listings = listings.filter(l => l.pickup_province === filters.province);
  return listings;
}
