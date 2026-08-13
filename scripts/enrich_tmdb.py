#!/usr/bin/env python3
"""
enrich_tmdb.py — TMDB API enrichment for Top 500 C-dramas
Supplements data with: posters, multi-language synopses, ratings, backdrop images.
Uses free API tier: 40 requests per 10 seconds.
"""

import os
import sys
import json
import sqlite3
import time
import logging
import requests
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
DB_PATH = DATA_DIR / 'cdrama.db'

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

# Rate limiting: 40 req per 10 seconds
REQUEST_INTERVAL = 0.3  # ~3 req/sec to stay well under limit


def get_tmdb_api_key() -> str:
    """Get TMDB API key from environment."""
    key = os.environ.get('TMDB_API_KEY', '')
    if not key or key == 'your_tmdb_api_key_here':
        logger.warning("TMDB_API_KEY not set. Set it in .env.local or environment.")
        logger.info("Get a free key at: https://www.themoviedb.org/settings/api")
        return ''
    return key


def tmdb_search_tv(title: str, api_key: str, year: Optional[int] = None) -> Optional[dict]:
    """Search TMDB for a TV show."""
    params = {
        'api_key': api_key,
        'query': title,
        'language': 'en-US',
        'page': 1,
    }
    if year:
        params['first_air_date_year'] = year
    
    try:
        resp = requests.get(f"{TMDB_BASE_URL}/search/tv", params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        if data.get('results'):
            # Filter for Chinese-language results
            for result in data['results']:
                if result.get('original_language') == 'zh' or result.get('origin_country') == ['CN']:
                    return result
            # Return first result if no exact Chinese match
            return data['results'][0]
    except requests.RequestException as e:
        logger.error(f"TMDB search error for '{title}': {e}")
    
    return None


def tmdb_get_details(tv_id: int, api_key: str, language: str = 'en-US') -> Optional[dict]:
    """Get TV show details from TMDB."""
    params = {
        'api_key': api_key,
        'language': language,
        'append_to_response': 'external_ids,content_ratings',
    }
    
    try:
        resp = requests.get(f"{TMDB_BASE_URL}/tv/{tv_id}", params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error(f"TMDB details error for ID {tv_id}: {e}")
        return None


def tmdb_get_translations(tv_id: int, api_key: str) -> dict:
    """Get translations for a TV show."""
    params = {'api_key': api_key}
    
    try:
        resp = requests.get(f"{TMDB_BASE_URL}/tv/{tv_id}/translations", params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        translations = {}
        for t in data.get('translations', []):
            iso = t.get('iso_3166_1', '')
            data_t = t.get('data', {})
            
            if iso == 'US' or t.get('iso_639_1') == 'en':
                if data_t.get('overview'):
                    translations['en'] = data_t['overview']
            elif iso == 'VN':
                if data_t.get('overview'):
                    translations['vi'] = data_t['overview']
            elif iso == 'TH':
                if data_t.get('overview'):
                    translations['th'] = data_t['overview']
        
        return translations
    except requests.RequestException as e:
        logger.error(f"TMDB translations error for ID {tv_id}: {e}")
        return {}


def enrich_dramas():
    """Main enrichment function."""
    api_key = get_tmdb_api_key()
    if not api_key:
        logger.info("No TMDB API key. Running in demo mode with mock data.")
        enrich_demo_mode()
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    # Get dramas without TMDB data (or all dramas for update)
    cursor = conn.execute("""
        SELECT id, slug, original_title, year, titles_json, synopses_json 
        FROM dramas 
        WHERE tmdb_id IS NULL OR poster_url IS NULL
        ORDER BY rating DESC
        LIMIT 500
    """)
    dramas = cursor.fetchall()
    logger.info(f"Found {len(dramas)} dramas to enrich")
    
    enriched = 0
    failed = 0
    
    for drama in dramas:
        drama_id = drama['id']
        title = drama['original_title']
        year = drama['year']
        
        logger.info(f"Enriching: {title} ({year or '?'})")
        
        # Search TMDB
        time.sleep(REQUEST_INTERVAL)
        result = tmdb_search_tv(title, api_key, year)
        
        if not result:
            logger.warning(f"  No TMDB match for: {title}")
            failed += 1
            continue
        
        tmdb_id = result['id']
        logger.info(f"  Found TMDB ID: {tmdb_id}")
        
        # Get details
        time.sleep(REQUEST_INTERVAL)
        details = tmdb_get_details(tmdb_id, api_key)
        
        if not details:
            failed += 1
            continue
        
        # Get translations
        time.sleep(REQUEST_INTERVAL)
        translations = tmdb_get_translations(tmdb_id, api_key)
        
        # Update poster/backdrop URLs
        poster_url = None
        backdrop_url = None
        if details.get('poster_path'):
            poster_url = f"{TMDB_IMAGE_BASE}/w500{details['poster_path']}"
        if details.get('backdrop_path'):
            backdrop_url = f"{TMDB_IMAGE_BASE}/w1280{details['backdrop_path']}"
        
        # Update synopses with translations
        try:
            existing_synopses = json.loads(drama['synopses_json'] or '{}')
        except (json.JSONDecodeError, TypeError):
            existing_synopses = {}
        
        if translations.get('en'):
            existing_synopses['en'] = translations['en']
        if translations.get('vi'):
            existing_synopses['vi'] = translations['vi']
        if translations.get('th'):
            existing_synopses['th'] = translations['th']
        
        # Update database
        conn.execute("""
            UPDATE dramas SET 
                tmdb_id = ?,
                poster_url = ?,
                backdrop_url = ?,
                rating = COALESCE(?, rating),
                episodes = COALESCE(?, episodes),
                synopses_json = ?,
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            tmdb_id,
            poster_url,
            backdrop_url,
            details.get('vote_average'),
            details.get('number_of_episodes'),
            json.dumps(existing_synopses),
            details.get('status'),
            drama_id
        ))
        
        conn.commit()
        enriched += 1
        
        if enriched % 10 == 0:
            logger.info(f"Progress: {enriched} enriched, {failed} failed")
    
    logger.info(f"Enrichment complete: {enriched} enriched, {failed} failed")
    conn.close()


def enrich_demo_mode():
    """Demo mode: enrich sample data with placeholder poster URLs."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    cursor = conn.execute("SELECT id, slug, poster_url FROM dramas WHERE poster_url IS NULL")
    dramas = cursor.fetchall()
    
    logger.info(f"Demo mode: adding placeholder data to {len(dramas)} dramas")
    
    # Map of known TMDB IDs for popular dramas
    known_tmdb = {
        'the-untamed': 86543,
        'word-of-honor': 118735,
        'nirvana-in-fire': 63333,
        'love-between-fairy-and-devil': 209008,
        'hidden-love': 222026,
        'reset': 197036,
        'the-knockout': 217536,
        'meet-yourself': 221215,
        'joy-of-life': 94885,
        'ashes-of-love': 80748,
    }
    
    for drama in dramas:
        tmdb_id = known_tmdb.get(drama['slug'])
        poster_url = f"https://image.tmdb.org/t/p/w500/placeholder_{drama['slug']}.jpg" if tmdb_id else None
        
        conn.execute("""
            UPDATE dramas SET tmdb_id = ?, poster_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (tmdb_id, poster_url, drama['id']))
    
    conn.commit()
    conn.close()
    logger.info("Demo mode enrichment complete.")


def main():
    logger.info("=" * 60)
    logger.info("CDrama Database - TMDB Enrichment")
    logger.info("=" * 60)
    
    if not DB_PATH.exists():
        logger.error(f"Database not found at {DB_PATH}. Run import_kaggle.py first.")
        sys.exit(1)
    
    enrich_dramas()
    logger.info("TMDB enrichment complete!")


if __name__ == '__main__':
    main()
