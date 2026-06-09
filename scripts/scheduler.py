#!/usr/bin/env python3
"""
Periodic scraper scheduler.

Usage:
    python scripts/scheduler.py

Runs scrapes on a schedule. Ideal for a VPS or always-on machine.
For serverless, use a cron trigger instead.
"""

import time
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()


def run_scrape():
    print(f"\n{'='*50}")
    print(f"⏰ Scheduled scrape started")
    print(f"{'='*50}")
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "scraper.py"), "--all"],
        capture_output=False,
    )
    if result.returncode == 0:
        # Optionally store to Supabase
        subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "store_scraped.py")],
            capture_output=False,
        )
    print(f"{'='*50}")
    print(f"🏁 Scrape finished. Sleeping...\n")


def main():
    import schedule

    # Run daily at 6 AM
    schedule.every().day.at("06:00").do(run_scrape)

    # Also run once immediately on startup
    run_scrape()

    print("🕐 Scheduler running. Press Ctrl+C to stop.")
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Scheduler stopped.")
