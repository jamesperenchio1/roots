#!/usr/bin/env python3
"""
Store scraped listings to Supabase.

Usage:
    export SUPABASE_URL=https://your-project.supabase.co
    export SUPABASE_SERVICE_KEY=your-service-role-key
    python scripts/store_scraped.py
"""

import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPT_DIR.parent
DATA_DIR = ROOT_DIR / "src" / "data"
LISTINGS_PATH = DATA_DIR / "scraped_listings.json"


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not key:
        print("❌ Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.")
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("❌ Install dependencies: pip install -r scripts/requirements.txt")
        sys.exit(1)

    if not LISTINGS_PATH.exists():
        print(f"❌ No scraped data found at {LISTINGS_PATH}. Run scraper.py first.")
        sys.exit(1)

    with open(LISTINGS_PATH, "r", encoding="utf-8") as f:
        listings = json.load(f)

    if not listings:
        print("⚠️ No listings to store.")
        return

    supabase = create_client(supabase_url, key)

    # Upsert into external_listings table
    # NOTE: You must create this table in Supabase first:
    #
    # CREATE TABLE external_listings (
    #   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    #   source_id text NOT NULL,
    #   external_id text NOT NULL,
    #   title text NOT NULL,
    #   price_thb integer NOT NULL,
    #   source_url text,
    #   image_url text,
    #   seller_name text,
    #   category text,
    #   scraped_at timestamptz,
    #   raw_data jsonb,
    #   UNIQUE(source_id, external_id)
    # );
    #
    # CREATE INDEX idx_external_listings_category ON external_listings(category);
    # CREATE INDEX idx_external_listings_scraped ON external_listings(scraped_at);

    batch = []
    for item in listings:
        batch.append({
            "source_id": item["source_id"],
            "external_id": item["external_id"],
            "title": item["title"],
            "price_thb": item["price_thb"],
            "source_url": item.get("source_url"),
            "image_url": item.get("image_url"),
            "seller_name": item.get("seller_name"),
            "category": item.get("category", "plant"),
            "scraped_at": item.get("scraped_at"),
            "raw_data": item,
        })

    try:
        # Upsert in batches of 100
        for i in range(0, len(batch), 100):
            chunk = batch[i:i + 100]
            result = supabase.table("external_listings").upsert(
                chunk, on_conflict="source_id,external_id"
            ).execute()
            print(f"  ✅ Stored batch {i//100 + 1}/{(len(batch)-1)//100 + 1} ({len(chunk)} items)")

        print(f"\n✅ Total stored: {len(batch)} external listings")
    except Exception as e:
        print(f"❌ Supabase error: {e}")
        print("   Make sure the 'external_listings' table exists (see script comments).")
        sys.exit(1)


if __name__ == "__main__":
    main()
