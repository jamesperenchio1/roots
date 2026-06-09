# Root Marketplace Scraper

Scrapes real plant, soil, and equipment listings from Thai e-commerce sites to feed the live price graph and external listing catalog.

## What to scrape from?

**Shopee Thailand** is the biggest source of plant sellers, but their anti-bot protection means you need to be careful:

- Use the built-in Shopee scraper with polite delays (1.5s between requests)
- If blocked (403), wait a few hours and retry
- For bulk/scale, apply for the **Shopee Affiliate API** — it's the legitimate way

**Shopify stores** are easier — many Thai nurseries use Shopify:
- Their `/products.json` endpoint is public
- Just add the store domain to `sources.json`

**Best long-term approach:** Partner with nurseries who give you a data feed (CSV, XML, or API). No scraping needed.

## Setup

```bash
cd scripts
pip install -r requirements.txt
```

## Configure sources

Edit `sources.json`:

```json
{
  "sources": [
    {
      "id": "shopee_th_plants",
      "name": "Shopee Thailand — Plants",
      "type": "shopee",
      "enabled": true,
      "search_keywords": ["monstera thai", "philodendron", "hoya"],
      "category": "plant",
      "limit_per_keyword": 20
    }
  ],
  "shopify_sources": [
    {
      "id": "my_nursery",
      "name": "My Partner Nursery",
      "store_domain": "nursery.myshopify.com",
      "enabled": true,
      "category": "plant"
    }
  ]
}
```

## Run a scrape

```bash
# Scrape all enabled sources
python scripts/scraper.py --all

# Scrape one source only
python scripts/scraper.py --source shopee_th_plants

# Dry run (don't save)
python scripts/scraper.py --all --dry-run
```

## Store to Supabase

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key
python scripts/store_scraped.py
```

Create the table first:

```sql
CREATE TABLE external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  price_thb integer NOT NULL,
  source_url text,
  image_url text,
  seller_name text,
  category text,
  scraped_at timestamptz,
  raw_data jsonb,
  UNIQUE(source_id, external_id)
);

CREATE INDEX idx_external_listings_category ON external_listings(category);
CREATE INDEX idx_external_listings_scraped ON external_listings(scraped_at);
```

## Run on a schedule

```bash
# Runs daily at 6 AM + once immediately
python scripts/scheduler.py
```

For serverless, trigger `scraper.py` + `store_scraped.py` via a cron job (GitHub Actions, AWS Lambda, etc.).

## Output files

- `src/data/scraped_listings.json` — raw listing data
- `src/data/scraped_prices.json` — daily price snapshots for the graph

The frontend automatically merges scraped price snapshots into the market graph when these files exist.
