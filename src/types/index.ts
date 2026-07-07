export type Category = 'aroid' | 'hoya' | 'cactus' | 'orchid' | 'succulent' | 'fern' | 'other';
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'sold' | 'withdrawn' | 'rejected';
export type TransactionStatus = 'pending_payment' | 'paid_in_escrow' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded' | 'cancelled';
export type PlantStatus = 'active' | 'deceased' | 'lost';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'resolved_partial';
export type DisputeReason = 'DOA' | 'mismatch' | 'wrong_species' | 'pests' | 'root_rot' | 'transit_damage' | 'other';
export type SizeCategory = 'S' | 'M' | 'L' | 'XL';
export type DeliveryOption = 'ship' | 'pickup';
export type WatchType = 'species' | 'listing';
export type AlertDirection = 'above' | 'below';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
export type NotificationType = 'order' | 'shipment' | 'dispute' | 'message' | 'offer' | 'review' | 'price_alert' | 'system';
export type FlagType = 'wash_trade' | 'joke_price' | 'outlier' | 'other';
export type ConversationType = 'direct' | 'group';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type MessageContentType = 'text' | 'markdown' | 'system';
export type UserPresenceStatus = 'online' | 'away' | 'offline';
export type ReportStatus = 'open' | 'reviewed' | 'resolved' | 'resolved_dismissed' | 'resolved_deleted';

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

export interface UserLocation {
  id: string;
  profile_id: string;
  name: string;
  address_line?: string;
  province?: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
  verified_at?: string;
  verification_method?: string;
  created_at: string;
  updated_at: string;
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
  shipping_cost_thb?: number;
  pickup_province?: string;
  pickup_location?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  status: ListingStatus;
  review_status?: string;
  qr_verification_photo_url?: string;
  qr_verified_at?: string;
  qr_verified_by?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_reason?: string;
  review_notes?: string;
  created_at: string;
  last_photo_update_at: string;
  plant?: Plant;
  seller?: Profile;
  photos?: ListingPhoto[];
  video?: ListingVideo;
  species?: Species;
  view_count?: number;
  watch_count?: number;
  tags?: string[];
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
  shipping_cost_thb?: number;
  status: TransactionStatus;
  omise_charge_id?: string;
  tracking_number?: string;
  courier?: string;
  shipment_photo_url?: string;
  payment_slip_path?: string;
  payment_ref?: string;
  payment_confirmed?: boolean;
  payment_confirmed_at?: string;
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

export interface QRScan {
  id: string;
  plant_id: string;
  scanner_user_id?: string;
  scan_source: 'camera' | 'manual' | 'url';
  ip_hash?: string;
  user_agent_hash?: string;
  created_at: string;
  scanner?: Profile;
}

export type IdentificationStatus = 'in_progress' | 'needs_evidence' | 'completed' | 'failed';
export type EvidenceType =
  | 'overall'
  | 'alternate_angle'
  | 'leaf'
  | 'leaf_underside'
  | 'stem'
  | 'node'
  | 'petiole'
  | 'roots'
  | 'flower'
  | 'fruit'
  | 'variegation'
  | 'pot'
  | 'height'
  | 'habitat';

export interface IdentificationRequest {
  id: string;
  user_id?: string;
  status: IdentificationStatus;
  requested_evidence_steps: EvidenceType[];
  current_step: number;
  country?: string;
  growing_conditions?: string;
  notes?: string;
  confidence_threshold: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface UploadedMedia {
  id: string;
  request_id: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  media_type: 'image' | 'video' | 'document' | 'archive';
  thumbnail_path?: string;
  preview_path?: string;
  evidence_type?: EvidenceType;
  metadata?: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  url?: string;
  thumbnail_url?: string;
}

export interface ProviderResult {
  provider: string;
  provider_version?: string;
  confidence: number;
  scientific_name: string;
  common_names: string[];
  detected_characteristics: string[];
  reasoning: string;
  raw_response?: Record<string, unknown>;
  processing_time_ms?: number;
}

export interface IdentificationResult {
  id: string;
  request_id: string;
  provider: string;
  provider_version?: string;
  detected_species_id?: string;
  scientific_name: string;
  common_names: string[];
  confidence: number;
  reasoning: string;
  detected_characteristics: string[];
  native_region?: string;
  growth_habit?: string;
  mature_size?: string;
  difficulty?: string;
  care_summary?: string;
  variegation?: string;
  known_aliases: string[];
  potential_rarity?: string;
  processing_time_ms?: number;
  created_at: string;
  provider_results?: ProviderResult[];
  market_estimate?: MarketEstimate;
}

export interface MarketEstimate {
  id: string;
  result_id: string;
  species_id?: string;
  avg_asking_price?: number;
  median_price?: number;
  lowest_active?: number;
  highest_active?: number;
  recent_sales_count: number;
  trend_percent?: number;
  suggested_range_low?: number;
  suggested_range_high?: number;
  confidence: string;
  data_sufficient: boolean;
  created_at: string;
}

export interface ProcessingHistoryEntry {
  id: string;
  request_id: string;
  stage: string;
  provider?: string;
  input_summary?: string;
  output_summary?: string;
  confidence?: number;
  duration_ms?: number;
  created_at: string;
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

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string;
  listing_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_id?: string;
  last_message_at?: string;
  archived_at?: string;
  metadata?: Record<string, unknown>;
  last_message?: Message;
  listing?: Listing;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  left_at?: string;
  last_read_message_id?: string;
  last_read_at?: string;
  is_muted: boolean;
  muted_until?: string;
  is_pinned: boolean;
  is_archived: boolean;
  user?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id?: string; // kept for legacy 1:1 convenience; prefer participants in new code
  listing_id?: string;
  content: string;
  content_type: MessageContentType;
  reply_to_message_id?: string;
  forwarded_from_message_id?: string;
  edited_at?: string;
  edited_by?: string;
  deleted_at?: string;
  flagged_contact_info: boolean;
  is_system_event: boolean;
  system_event_type?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
  sender?: Profile;
  reply_to?: Message;
  forwarded_from?: Message;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  reads?: MessageRead[];
  delivered_to?: string[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  conversation_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  storage_path: string;
  thumbnail_path?: string;
  preview_path?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  url?: string;
  thumbnail_url?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  user?: Profile;
}

export interface MessageRead {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  read_at: string;
  user?: Profile;
}

export interface MessageReport {
  id: string;
  message_id: string;
  conversation_id: string;
  reported_by: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  reporter?: Profile;
  resolver?: Profile;
}

export interface UserPresence {
  id: string;
  status: UserPresenceStatus;
  last_seen_at: string;
  last_active_at: string;
  updated_at: string;
  user?: Profile;
}

export interface TypingUser {
  user_id: string;
  display_name: string;
  started_at: string;
}

export interface EmailQueueItem {
  id: string;
  recipient_id: string;
  conversation_id: string;
  message_id?: string;
  sender_name?: string;
  preview?: string;
  scheduled_at: string;
  sent_at?: string;
  cancelled_at?: string;
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

export interface Review {
  id: string;
  transaction_id: string;
  listing_id: string;
  reviewer_id: string;
  seller_id: string;
  rating: number;
  comment: string;
  tags: string[];
  created_at: string;
  reviewer?: Profile;
  listing?: Listing;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price_thb: number;
  message?: string;
  status: OfferStatus;
  counter_price_thb?: number;
  conversation_id?: string;
  created_at: string;
  responded_at?: string;
  listing?: Listing;
  buyer?: Profile;
  seller?: Profile;
}

export interface SellerAnalytics {
  listing_views: number;
  total_sales: number;
  pending_sales: number;
  escrow_balance: number;
  avg_sale_price: number;
  listings_by_status: Record<string, number>;
}
