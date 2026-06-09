export interface ExternalListing {
  source_id: string;
  source_name: string;
  source_url: string;
  external_id: string;
  title: string;
  price_thb: number;
  original_price_thb?: number | null;
  currency: string;
  image_url?: string;
  seller_name?: string;
  seller_location?: string;
  sold_count?: number;
  rating?: number | null;
  rating_count?: number;
  category_hint?: string;
  category?: string;
  tags?: string[];
  product_type?: string;
  scraped_at: string;
}

export interface ScrapedPriceSnapshot {
  species_id: string;
  snapshot_date: string;
  median_price_thb: number;
  mean_price_thb: number;
  min_price_thb: number;
  max_price_thb: number;
  sale_count: number;
  source: string;
}
