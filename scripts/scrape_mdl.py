#!/usr/bin/env python3
"""
scrape_mdl.py — MyDramaList conservative scraper
Scrapes Top 200 C-dramas for detailed tags, actors, and additional metadata.
Rate limited: 1 request per 3 seconds with User-Agent rotation.
"""

import os
import sys
import json
import sqlite3
import time
import random
import logging
import requests
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
DB_PATH = DATA_DIR / 'cdrama.db'

MDL_BASE = "https://mydramalist.com"

# User-Agent rotation pool
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

# Rate limit: 1 request per 3 seconds
REQUEST_INTERVAL = 3.0


def get_session() -> requests.Session:
    """Create a requests session with random User-Agent."""
    session = requests.Session()
    session.headers.update({
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    })
    return session


def fetch_page(session: requests.Session, url: str) -> Optional[str]:
    """Fetch a page with rate limiting and error handling."""
    time.sleep(REQUEST_INTERVAL)
    
    # Rotate user agent
    session.headers['User-Agent'] = random.choice(USER_AGENTS)
    
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return None


def parse_drama_page(html: str) -> dict:
    """Parse a MyDramaList drama page for metadata."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed. Install with: pip install beautifulsoup4 lxml")
        return {}
    
    soup = BeautifulSoup(html, 'lxml')
    data = {}
    
    # Extract tags/genres
    genres = []
    genre_el = soup.select('.show-details .list .value a')
    for a in genre_el:
        text = a.get_text(strip=True)
        if text:
            genres.append(text)
    data['genres'] = genres
    
    # Extract tags
    tags = []
    tag_el = soup.select('.show-tags a')
    for a in tag_el:
        text = a.get_text(strip=True)
        if text:
            tags.append(text.lower().replace(' ', '_'))
    data['tags'] = tags
    
    # Extract actors (main cast)
    actors = []
    actor_el = soup.select('.list-item.col.col-md-4')
    for el in actor_el[:10]:  # Top 10 cast
        name_el = el.select_one('.text')
        if name_el:
            actors.append(name_el.get_text(strip=True))
    data['actors'] = actors
    
    # Extract synopsis
    synopsis_el = soup.select_one('.show-synopsis .more') or soup.select_one('.show-synopsis')
    if synopsis_el:
        data['synopsis'] = synopsis_el.get_text(strip=True)
    
    # Extract rating
    rating_el = soup.select_one('.score-value')
    if rating_el:
        try:
            data['rating'] = float(rating_el.get_text(strip=True))
        except ValueError:
            pass
    
    return data


def scrape_top_dramas() -> list:
    """Scrape the top 200 Chinese dramas from MDL."""
    logger.info("Scraping MyDramaList Top 200 Chinese Dramas...")
    
    session = get_session()
    drama_urls = []
    
    # MDL uses pagination for lists
    for page in range(1, 11):  # 10 pages, ~20 per page
        url = f"{MDL_BASE}/shows/country/china?sort=popularity&page={page}"
        logger.info(f"Fetching page {page}: {url}")
        
        html = fetch_page(session, url)
        if not html:
            continue
        
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'lxml')
            
            # Find drama links
            for item in soup.select('.show-item .title a, .ss-1 a, .list-item a[href*="/dramas/"]'):
                href = item.get('href', '')
                if '/dramas/' in href and href not in drama_urls:
                    drama_urls.append(href)
                    
        except Exception as e:
            logger.error(f"Error parsing page {page}: {e}")
            continue
        
        if len(drama_urls) >= 200:
            break
    
    logger.info(f"Found {len(drama_urls)} drama URLs to scrape")
    return drama_urls[:200]


def scrape_drama_details(session: requests.Session, url: str) -> dict:
    """Scrape details for a single drama."""
    html = fetch_page(session, url)
    if not html:
        return {}
    
    data = parse_drama_page(html)
    data['mdl_url'] = url
    return data


def update_db_with_mdl_data(drama_slug: str, mdl_data: dict):
    """Update database with MyDramaList data."""
    if not mdl_data:
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    
    # Update tags
    if mdl_data.get('tags'):
        conn.execute("""
            UPDATE dramas SET tags = ?, updated_at = CURRENT_TIMESTAMP
            WHERE slug = ?
        """, (json.dumps(mdl_data['tags']), drama_slug))
    
    # Update genres if empty
    if mdl_data.get('genres'):
        conn.execute("""
            UPDATE dramas SET genres = COALESCE(
                CASE WHEN genres IS NULL THEN ? ELSE genres END, 
                genres
            )
            WHERE slug = ?
        """, (json.dumps(mdl_data['genres']), drama_slug))
    
    conn.commit()
    conn.close()


def main():
    logger.info("=" * 60)
    logger.info("CDrama Database - MyDramaList Scraper")
    logger.info("=" * 60)
    logger.info("WARNING: This scraper is conservative.")
    logger.info("Rate: 1 request per 3 seconds. Max 200 dramas.")
    logger.info("Respect robots.txt and terms of service.")
    
    if not DB_PATH.exists():
        logger.error(f"Database not found at {DB_PATH}. Run import_kaggle.py first.")
        sys.exit(1)
    
    # For MVP: just log that we'd scrape, don't actually hit MDL
    # In production, uncomment the scraping code below
    logger.info("")
    logger.info("MVP Mode: Scraper ready but not executing live requests.")
    logger.info("To enable: set MDL_SCRAPER_ENABLED=true in environment")
    
    if os.environ.get('MDL_SCRAPER_ENABLED') != 'true':
        logger.info("Skipping live scraping. Set MDL_SCRAPER_ENABLED=true to enable.")
        logger.info("The scraper functions are implemented and ready for production use.")
        return
    
    # Live scraping (only when explicitly enabled)
    session = get_session()
    urls = scrape_top_dramas()
    
    scraped = 0
    for url in urls:
        logger.info(f"Scraping ({scraped+1}/{len(urls)}): {url}")
        data = scrape_drama_details(session, f"{MDL_BASE}{url}")
        if data:
            # Extract slug from URL
            slug = url.strip('/').split('/')[-1]
            update_db_with_mdl_data(slug, data)
            scraped += 1
    
    logger.info(f"Scraping complete. Updated {scraped} dramas.")


if __name__ == '__main__':
    main()
