#!/usr/bin/env python3
"""
Root Marketplace Scraper
========================
Scrapes real plant, soil, and equipment listings from Thai e-commerce sites
to build a live price graph and external listing catalog.

Usage:
    python scripts/scraper.py --source shopee_th_plants
    python scripts/scraper.py --all
    python scripts/scraper.py --dry-run

Add new sources in scripts/sources.json
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPT_DIR.parent
DATA_DIR = ROOT_DIR / "src" / "data"
SOURCES_PATH = SCRIPT_DIR / "sources.json"
OUTPUT_PATH = DATA_DIR / "scraped_listings.json"
PRICES_PATH = DATA_DIR / "scraped_prices.json"

# ---------------------------------------------------------------------------
# HTTP session with sensible defaults
# ---------------------------------------------------------------------------
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
})

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def load_sources() -> dict:
    with open(SOURCES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  💾 Saved {path.name} ({len(data) if isinstance(data, list) else 'dict'})")


def load_json(path: Path, default: Any = None):
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def thb_from_raw(price: int | None) -> int | None:
    """Shopee prices are in smallest currency unit (100 = 1 THB)."""
    if price is None:
        return None
    return max(price // 100, 1)


def clean_name(name: str) -> str:
    # Remove excessive emoji and whitespace
    name = re.sub(r"[\n\r\t]+", " ", name)
    name = re.sub(r"\s{2,}", " ", name)
    return name.strip()


# ---------------------------------------------------------------------------
# Shopee Thailand scraper
# ---------------------------------------------------------------------------
def scrape_shopee_search(keyword: str, limit: int = 20) -> list[dict]:
    """
    Scrape Shopee Thailand search results for a keyword.
    Uses the public search_items API endpoint.
    """
    encoded_kw = quote(keyword)
    url = (
        f"https://shopee.co.th/api/v4/search/search_items"
        f"?by=relevancy&keyword={encoded_kw}&limit={limit}"
        f"&newest=0&order=desc&page_type=search"
        f"&scenario=PAGE_GLOBAL_SEARCH&version=2"
    )

    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.HTTPError as e:
        if resp.status_code == 403:
            print(f"    ⚠️ Shopee blocked request (403). Try again later or use a proxy.")
        else:
            print(f"    ⚠️ HTTP error {resp.status_code}: {e}")
        return []
    except Exception as e:
        print(f"    ⚠️ Request failed: {e}")
        return []

    items = data.get("items", [])
    results = []
    for item in items:
        basic = item.get("item_basic", {})
        if not basic:
            continue

        name = clean_name(basic.get("name", ""))
        if not name:
            continue

        raw_price = basic.get("price")
        price_thb = thb_from_raw(raw_price)
        if not price_thb:
            continue

        shop_info = item.get("shop_basic", {})
        results.append({
            "source_id": "shopee_th",
            "source_name": "Shopee Thailand",
            "source_url": f"https://shopee.co.th/product/{shop_info.get('shopid', 0)}/{basic.get('itemid', 0)}",
            "external_id": str(basic.get("itemid", "")),
            "title": name,
            "price_thb": price_thb,
            "original_price_thb": thb_from_raw(basic.get("price_before_discount")),
            "currency": "THB",
            "image_url": f"https://cf.shopee.co.th/file/{basic.get('image', '')}",
            "seller_name": shop_info.get("name", ""),
            "seller_location": shop_info.get("shop_location", ""),
            "sold_count": basic.get("sold", 0),
            "rating": basic.get("item_rating", {}).get("rating_star"),
            "rating_count": basic.get("item_rating", {}).get("rating_count", [0])[0],
            "category_hint": keyword,
            "scraped_at": now_iso(),
        })

    return results


# ---------------------------------------------------------------------------
# Shopify scraper
# ---------------------------------------------------------------------------
def scrape_shopify_store(domain: str, limit: int = 250) -> list[dict]:
    """
    Scrape products from a Shopify store via their public products.json endpoint.
    domain example: "example.myshopify.com" or "example.com" (we try both)
    """
    domains_to_try = [domain]
    if ".myshopify.com" not in domain:
        domains_to_try.append(domain.replace("https://", "").replace("http://", "").strip("/"))
        domains_to_try.append(f"{domain}.myshopify.com")

    for d in domains_to_try:
        url = f"https://{d}/products.json?limit={limit}"
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                break
        except Exception:
            continue
    else:
        print(f"    ⚠️ Could not reach Shopify store: {domain}")
        return []

    products = data.get("products", [])
    results = []
    for p in products:
        variants = p.get("variants", [])
        if not variants:
            continue
        v = variants[0]
        price = float(v.get("price", 0))
        if price <= 0:
            continue

        results.append({
            "source_id": f"shopify_{domain}",
            "source_name": domain,
            "source_url": f"https://{d}/products/{p.get('handle', '')}",
            "external_id": str(p.get("id", "")),
            "title": clean_name(p.get("title", "")),
            "price_thb": int(price),
            "original_price_thb": int(float(v.get("compare_at_price", price))) if v.get("compare_at_price") else None,
            "currency": "THB",
            "image_url": p.get("images", [{}])[0].get("src", ""),
            "seller_name": domain,
            "tags": p.get("tags", []),
            "product_type": p.get("product_type", ""),
            "scraped_at": now_iso(),
        })

    return results


# ---------------------------------------------------------------------------
# Price snapshot builder
# ---------------------------------------------------------------------------
def build_price_snapshots(listings: list[dict], days: int = 30) -> list[dict]:
    """
    Build daily price snapshot entries from scraped listings for the price graph.
    Groups by keyword/category and computes median/min/max per day.
    """
    snapshots = []
    today = datetime.now(timezone.utc)

    # Group listings by category_hint
    by_category: dict[str, list[dict]] = {}
    for l in listings:
        cat = l.get("category_hint", "unknown")
        by_category.setdefault(cat, []).append(l)

    for cat, items in by_category.items():
        prices = [i["price_thb"] for i in items if i.get("price_thb")]
        if not prices:
            continue
        prices.sort()
        mid = len(prices) // 2
        median = prices[mid] if len(prices) % 2 else (prices[mid - 1] + prices[mid]) // 2
        mean = sum(prices) // len(prices)

        for d in range(days):
            date = today.replace(day=today.day - d)
            # Use the same snapshot for all days (we don't have historical scrape data yet)
            # In production, you'd store daily scrapes and compute real trends
            snapshots.append({
                "species_id": f"scraped-{cat}",
                "snapshot_date": date.strftime("%Y-%m-%d"),
                "median_price_thb": median,
                "mean_price_thb": mean,
                "min_price_thb": min(prices),
                "max_price_thb": max(prices),
                "sale_count": len(items),
                "source": "scraped",
            })

    return snapshots


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------
def run_scraper(source_filter: str | None = None, dry_run: bool = False):
    print("🌿 Root Marketplace Scraper")
    print(f"   Started at {now_iso()}")

    sources = load_sources()
    all_listings: list[dict] = []

    # ---- Shopee sources ----
    for src in sources.get("sources", []):
        if not src.get("enabled", False):
            continue
        if source_filter and src["id"] != source_filter:
            continue

        print(f"\n📦 Source: {src['name']} ({src['type']})")
        if src["type"] == "shopee":
            for kw in src.get("search_keywords", []):
                print(f"  🔍 Searching: '{kw}'")
                items = scrape_shopee_search(kw, limit=src.get("limit_per_keyword", 20))
                for item in items:
                    item["category"] = src.get("category", "plant")
                print(f"    ✅ Found {len(items)} items")
                all_listings.extend(items)
                time.sleep(1.5)  # polite delay
        else:
            print(f"    ⚠️ Unknown source type: {src['type']}")

    # ---- Shopify sources ----
    for src in sources.get("shopify_sources", []):
        if not src.get("enabled", False):
            continue
        if source_filter and src["id"] != source_filter:
            continue

        print(f"\n📦 Source: {src['name']} (shopify)")
        if not src.get("store_domain"):
            print("    ⚠️ No store_domain configured. Skipping.")
            continue
        items = scrape_shopify_store(src["store_domain"])
        for item in items:
            item["category"] = src.get("category", "plant")
        print(f"    ✅ Found {len(items)} items")
        all_listings.extend(items)
        time.sleep(1)

    print(f"\n📊 Total scraped: {len(all_listings)} listings")

    if dry_run:
        print("\n🧪 DRY RUN — not saving.")
        for l in all_listings[:5]:
            print(f"   • {l['title'][:50]} — {l['price_thb']} THB")
        return

    # Save listings
    save_json(OUTPUT_PATH, all_listings)

    # Build and save price snapshots
    snapshots = build_price_snapshots(all_listings)
    save_json(PRICES_PATH, snapshots)

    # Print summary
    plants = [l for l in all_listings if l.get("category") == "plant"]
    equipment = [l for l in all_listings if l.get("category") == "equipment"]
    print(f"\n✅ Done!")
    print(f"   Plants: {len(plants)}")
    print(f"   Soil/Equipment: {len(equipment)}")
    print(f"   Price snapshots: {len(snapshots)}")
    print(f"\nNext steps:")
    print(f"   1. Review {OUTPUT_PATH}")
    print(f"   2. Import to Supabase: python scripts/store_scraped.py")
    print(f"   3. Schedule daily runs: python scripts/scheduler.py")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Root Marketplace Scraper")
    parser.add_argument("--source", help="Scrape a single source by ID")
    parser.add_argument("--all", action="store_true", help="Scrape all enabled sources")
    parser.add_argument("--dry-run", action="store_true", help="Show results without saving")
    args = parser.parse_args()

    if not args.source and not args.all:
        parser.print_help()
        sys.exit(1)

    run_scraper(source_filter=args.source, dry_run=args.dry_run)
