#!/usr/bin/env python3
"""
update_backdrop_data.py — Populate backdrop_url from TMDB API for hero carousel.

Reads all dramas with tmdb_id, calls TMDB API to get backdrop_path,
and updates the backdrop_url field in the database.

Stores full URL: https://image.tmdb.org/t/p/original{backdrop_path}

Usage:
    # Set TMDB_API_KEY in environment or .env.local
    python scripts/update_backdrop_data.py

    # Or with explicit key:
    TMDB_API_KEY=your_key python scripts/update_backdrop_data.py

Idempotent: safe to run multiple times. Only updates null/empty backdrop_url fields.
Use --force to re-fetch all.
"""

import os
import sys
import json
import sqlite3
import time
import argparse
import logging
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / 'data'
DB_PATH = DATA_DIR / 'cdrama.db'

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"
REQUEST_INTERVAL = 0.35  # ~3 req/sec, well under TMDB rate limit (40/10s)

# Verified backdrop data from TMDB (collected via third-party TMDB mirrors)
# These are used as fallback when API is not reachable, or to verify API results
VERIFIED_BACKDROPS = {
    # slug: { 'backdrop_path': '/xxxxx.jpg', 'tmdb_id': 12345 }
    'the-untamed': {
        'backdrop_path': '/mthKQh5uBwRnwJOafA1xfGOoj3J.jpg',
        'correct_tmdb_id': 90761,  # DB has 86543, TMDB says 90761
    },
    'word-of-honor': {
        'backdrop_path': '/xWBD0BqiPsmXBZNeT6UMCMdMXvX.jpg',
        'correct_tmdb_id': 119362,  # DB has 118735
    },
    'love-between-fairy-and-devil': {
        'backdrop_path': '/aJxMvBSaUdbIkY8nqFkuEarrgcx.jpg',
        'correct_tmdb_id': 206534,  # DB has 209008 (animation, not live-action)
    },
    'story-of-minglan': {
        'backdrop_path': '/64YigOkGkBVUvWo9WpR45y4zjuf.jpg',
        'correct_tmdb_id': 81502,  # Confirmed match
    },
    'the-longest-promise': {
        'backdrop_path': '/lCWgWkYsUTTXlQUGmoQyAAdvgeD.jpg',
        'correct_tmdb_id': 130270,  # DB has 137206
    },
    'joy-of-life': {
        'backdrop_path': '/4eNmWhBfDfAj8qbKHPgW394rAK8.jpg',
        'correct_tmdb_id': 95842,  # DB has 94885
    },
    'meet-yourself': {
        'backdrop_path': None,  # Need to fetch from API
        'correct_tmdb_id': 221215,  # Needs verification
    },
}


def load_env():
    """Load environment variables from .env.local if present."""
    env_file = PROJECT_DIR / '.env.local'
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and not os.environ.get(key):
                        os.environ[key] = value


def get_tmdb_api_key() -> str:
    """Get TMDB API key from environment."""
    load_env()
    key = os.environ.get('TMDB_API_KEY', '')
    if not key or key == 'your_tmdb_api_key_here':
        logger.error("TMDB_API_KEY not set!")
        logger.info("Set it in .env.local or environment variable.")
        logger.info("Get a free key at: https://www.themoviedb.org/settings/api")
        sys.exit(1)
    return key


def tmdb_request(url: str, api_key: str) -> Optional[dict]:
    """Make a TMDB API request with error handling."""
    separator = '&' if '?' in url else '?'
    full_url = f"{url}{separator}api_key={api_key}&language=en-US"

    try:
        req = Request(full_url, headers={
            'Accept': 'application/json',
            'User-Agent': 'CDrama-Database/1.0',
        })
        with urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        logger.warning(f"HTTP error {e.code} for {url}: {e.reason}")
        return None
    except URLError as e:
        logger.warning(f"Network error for {url}: {e.reason}")
        return None
    except Exception as e:
        logger.warning(f"Error fetching {url}: {e}")
        return None


def search_tmdb_by_title(title: str, year: Optional[int], api_key: str) -> Optional[int]:
    """Search TMDB for a TV show by title and return the TMDB ID."""
    import urllib.parse
    query = urllib.parse.quote(title)
    url = f"{TMDB_BASE_URL}/search/tv?query={query}&page=1"
    if year:
        url += f"&first_air_date_year={year}"

    data = tmdb_request(url, api_key)
    if not data or not data.get('results'):
        return None

    # Return the first result's ID
    return data['results'][0]['id']


def fetch_backdrop(tmdb_id: int, api_key: str) -> Optional[str]:
    """Fetch backdrop_path from TMDB for a given TV show ID."""
    url = f"{TMDB_BASE_URL}/tv/{tmdb_id}"
    data = tmdb_request(url, api_key)
    if not data:
        return None
    return data.get('backdrop_path')


def update_drama_backdrop(cursor, slug: str, backdrop_url: Optional[str], tmdb_id: Optional[int] = None):
    """Update a drama's backdrop_url (and optionally tmdb_id) in the database."""
    if tmdb_id is not None:
        cursor.execute(
            "UPDATE dramas SET backdrop_url = ?, tmdb_id = ?, updated_at = datetime('now') WHERE slug = ?",
            (backdrop_url, tmdb_id, slug)
        )
    else:
        cursor.execute(
            "UPDATE dramas SET backdrop_url = ?, updated_at = datetime('now') WHERE slug = ?",
            (backdrop_url, slug)
        )


def main():
    parser = argparse.ArgumentParser(description='Populate backdrop_url from TMDB API')
    parser.add_argument('--force', action='store_true',
                        help='Re-fetch all backdrops, even if already set')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be updated without modifying the database')
    parser.add_argument('--use-verified-only', action='store_true',
                        help='Only use verified backdrop data, skip API calls')
    args = parser.parse_args()

    if not DB_PATH.exists():
        logger.error(f"Database not found at {DB_PATH}")
        sys.exit(1)

    api_key = get_tmdb_api_key()
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Fetch all dramas
    cursor.execute("SELECT slug, tmdb_id, original_title, year, backdrop_url FROM dramas ORDER BY slug")
    dramas = cursor.fetchall()

    logger.info(f"Found {len(dramas)} dramas in database")

    updated = 0
    skipped = 0
    failed = 0
    tmdb_id_corrections = []

    for slug, tmdb_id, original_title, year, current_backdrop in dramas:
        # Skip if backdrop already set (unless --force)
        if current_backdrop and not args.force:
            logger.info(f"  SKIP {slug}: backdrop already set")
            skipped += 1
            continue

        logger.info(f"  Processing: {slug} (TMDB ID: {tmdb_id}, Title: {original_title})")

        # Check verified data first
        verified = VERIFIED_BACKDROPS.get(slug, {})
        verified_path = verified.get('backdrop_path')
        correct_id = verified.get('correct_tmdb_id')

        # Check if TMDB ID needs correction
        if correct_id and correct_id != tmdb_id:
            logger.warning(f"    TMDB ID mismatch! DB has {tmdb_id}, correct is {correct_id}")
            tmdb_id_corrections.append((slug, tmdb_id, correct_id))
            tmdb_id = correct_id

        backdrop_url = None

        if args.use_verified_only and verified_path:
            backdrop_url = f"{TMDB_IMAGE_BASE}{verified_path}"
            logger.info(f"    Using verified backdrop: {verified_path}")
        elif not args.use_verified_only:
            # Try API first
            if tmdb_id:
                time.sleep(REQUEST_INTERVAL)
                backdrop_path = fetch_backdrop(tmdb_id, api_key)

                if backdrop_path:
                    backdrop_url = f"{TMDB_IMAGE_BASE}{backdrop_path}"
                    logger.info(f"    API backdrop: {backdrop_path}")

                    # Verify against known data
                    if verified_path and backdrop_path != verified_path:
                        logger.warning(f"    API result differs from verified! API: {backdrop_path}, Verified: {verified_path}")
                else:
                    logger.warning(f"    No backdrop from API for TMDB ID {tmdb_id}")

            # Fallback: try search by title
            if not backdrop_path:
                logger.info(f"    Trying search by title: {original_title}")
                time.sleep(REQUEST_INTERVAL)
                found_id = search_tmdb_by_title(original_title, year, api_key)
                if found_id:
                    logger.info(f"    Found TMDB ID by search: {found_id}")
                    if found_id != tmdb_id:
                        tmdb_id_corrections.append((slug, tmdb_id, found_id))
                        tmdb_id = found_id
                    time.sleep(REQUEST_INTERVAL)
                    backdrop_path = fetch_backdrop(found_id, api_key)
                    if backdrop_path:
                        backdrop_url = f"{TMDB_IMAGE_BASE}{backdrop_path}"
                        logger.info(f"    Found backdrop via search: {backdrop_path}")

            # Fallback to verified data
            if not backdrop_url and verified_path:
                backdrop_url = f"{TMDB_IMAGE_BASE}{verified_path}"
                logger.info(f"    Using verified fallback: {verified_path}")

        # Update database
        if backdrop_url:
            if args.dry_run:
                logger.info(f"    [DRY RUN] Would update backdrop_url to: {backdrop_url}")
            else:
                update_drama_backdrop(cursor, slug, backdrop_url, correct_id)
                logger.info(f"    ✓ Updated backdrop_url")
            updated += 1
        else:
            logger.warning(f"    ✗ No backdrop found for {slug}")
            failed += 1

    # Commit changes
    if not args.dry_run:
        conn.commit()
        logger.info("Database committed.")

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info(f"  Total dramas: {len(dramas)}")
    logger.info(f"  Updated:      {updated}")
    logger.info(f"  Skipped:      {skipped}")
    logger.info(f"  Failed:       {failed}")

    if tmdb_id_corrections:
        logger.info(f"\n  TMDB ID corrections ({len(tmdb_id_corrections)}):")
        for slug, old_id, new_id in tmdb_id_corrections:
            logger.info(f"    {slug}: {old_id} → {new_id}")

    # Verify results
    cursor.execute("SELECT slug, backdrop_url FROM dramas WHERE backdrop_url IS NOT NULL AND backdrop_url != ''")
    results = cursor.fetchall()
    logger.info(f"\n  Dramas with backdrop_url: {len(results)}/{len(dramas)}")
    for slug, url in results:
        logger.info(f"    {slug}: {url[:80]}...")

    conn.close()
    logger.info("\nDone!")


if __name__ == '__main__':
    main()
