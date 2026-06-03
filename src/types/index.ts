export type Category = 'aroid' | 'hoya' | 'cactus' | 'orchid' | 'succulent' | 'fern' | 'other';
export type ListingStatus = 'active' | 'sold' | 'withdrawn' | 'draft';
export type TransactionStatus = 'pending_payment' | 'paid_in_escrow' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded' | 'cancelled';
export type PlantStatus = 'active' | 'deceased' | 'lost';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'resolved_partial';
export type DisputeReason = 'DOA' | 'mismatch' | 'wrong_species' | 'pests' | 'root_rot' | 'transit_damage' | 'other';
export type SizeCategory = 'S' | 'M' | 'L' | 'XL';
export type DeliveryOption = 'ship' | 'pickup';
export type WatchType = 'species' | 'listing';
export type AlertDirection = 'above' | 'below';
export type FlagType = 'wash_trade' | 'joke_price' | 'outlier' | 'other';

export interface Profile {
  id: string;
  display_name: string;
  promptpay_id?: string | null;
  default_shipping_address?: ShippingAddress;
  is_admin: boolean;
  strike_count: number;
  is_banned: boolean;
  language_preference: 'th' | 'en';
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  location?: string;
  rating?: number;
  sales_count?: number;
}

export interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  district: string;
  province: string;
  postal_code: string;
  phone: string;
}

export interface Species {
  id: string;
  scientific_name: string;
  common_name_th?: string;
  common_name_en?: string;
  synonyms: string[];
  category: Category;
  created_at: string;
  image_url?: string;
  description?: string;
  care_level?: 'easy' | 'moderate' | 'advanced';
  light_requirement?: string;
}

export interface Plant {
  id: string;
  species_id: string;
  current_owner_id: string;
  parent_plant_id?: string;
  status: PlantStatus;
  created_at: string;
  qr_signature: string;
  species?: Species;
  current_owner?: Profile;
}

export interface Listing {
  id: string;
  plant_id: string;
  seller_id: string;
  price_thb: number;
  size_category: SizeCategory;
  size_cm_range?: string;
  pot_size_cm?: number;
  description: string;
  delivery_options: DeliveryOption[];
  pickup_province?: string;
  status: ListingStatus;
  created_at: string;
  last_photo_update_at: string;
  plant?: Plant;
  seller?: Profile;
  photos?: ListingPhoto[];
  video?: ListingVideo;
  species?: Species;
  view_count?: number;
  watch_count?: number;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  storage_path: string;
  order_index: number;
  phash?: string;
  created_at: string;
}

export interface ListingVideo {
  id: string;
  listing_id: string;
  storage_path: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  plant_id: string;
  sale_price_thb: number;
  platform_fee_thb: number;
  seller_payout_thb: number;
  status: TransactionStatus;
  omise_charge_id?: string;
  tracking_number?: string;
  courier?: string;
  delivery_method: DeliveryOption;
  shipped_at?: string;
  delivered_at?: string;
  escrow_release_at?: string;
  completed_at?: string;
  created_at: string;
  listing?: Listing;
  buyer?: Profile;
  seller?: Profile;
  plant?: Plant;
}

export interface Transfer {
  id: string;
  plant_id: string;
  from_user_id?: string | null;
  to_user_id: string;
  transaction_id?: string | null;
  sale_price_thb?: number | null;
  transferred_at: string;
  from_user?: Profile;
  to_user?: Profile;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  opened_by: 'buyer' | 'seller';
  reason: DisputeReason;
  description: string;
  evidence_urls: string[];
  status: DisputeStatus;
  admin_notes?: string;
  resolution_amount_thb?: number;
  created_at: string;
  resolved_at?: string;
  transaction?: Transaction;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  listing_id?: string;
  content: string;
  flagged_contact_info: boolean;
  created_at: string;
  read_at?: string;
  sender?: Profile;
}

export interface PriceSnapshot {
  id: string;
  species_id: string;
  size_category?: SizeCategory;
  snapshot_date: string;
  median_price_thb: number;
  mean_price_thb: number;
  min_price_thb: number;
  max_price_thb: number;
  sale_count: number;
  created_at: string;
}

export interface MarketFlag {
  id: string;
  transaction_id: string;
  flag_type: FlagType;
  excluded_from_aggregate: boolean;
  flagged_by: string;
  notes?: string;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  watch_type: WatchType;
  target_id: string;
  created_at: string;
  species?: Species;
  listing?: Listing;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  species_id: string;
  size_category?: SizeCategory;
  threshold_thb: number;
  direction: AlertDirection;
  triggered_at?: string;
  created_at: string;
  species?: Species;
}

export interface ProvenanceChain {
  plant: Plant;
  transfers: Transfer[];
  total_owners: number;
  total_sales_value: number;
  origin_date: string;
}

export interface MarketOverview {
  trending_up: TrendingSpecies[];
  trending_down: TrendingSpecies[];
  most_traded: TrendingSpecies[];
  high_value_sales: Transaction[];
  hot_right_now: TrendingSpecies[];
  cold: TrendingSpecies[];
}

export interface TrendingSpecies {
  species: Species;
  current_median: number;
  previous_median: number;
  percent_change: number;
  sales_count: number;
  sparkline_data: number[];
}

export interface DashboardStats {
  gmv_today: number;
  gmv_week: number;
  gmv_month: number;
  active_listings: number;
  dispute_rate: number;
  user_count: number;
  pending_disputes: number;
  pending_payouts: number;
}

export interface SellerAnalytics {
  listing_views: number;
  total_sales: number;
  pending_sales: number;
  escrow_balance: number;
  avg_sale_price: number;
  listings_by_status: Record<string, number>;
}
