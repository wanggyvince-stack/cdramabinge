#!/usr/bin/env python3
"""
Batch enrich drama data via Vercel /api/enrich-drama endpoint.
Updates local SQLite DB with TMDB data (tmdb_id, poster, backdrop, trailer).
Also generates data/trailers.json for static trailer lookup.
"""
import sqlite3
import json
import time
import sys
import urllib.request
import urllib.error

VERCEL_BASE = "https://cdramabinge.com/api/enrich-drama"
DB_PATH = "data/cdrama.db"
TRAILERS_PATH = "data/trailers.json"

def fetch_json(url, retries=2):
    """Fetch JSON from URL with retries."""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CDramaDB/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt < retries:
                print(f"  Retry {attempt+1}/{retries} after error: {e}")
                time.sleep(2)
            else:
                print(f"  FAILED after {retries+1} attempts: {e}")
                return None

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get all dramas that need enrichment
    # 1. Missing tmdb_id
    cur.execute("SELECT slug, original_title, titles_json, year FROM dramas WHERE tmdb_id IS NULL")
    missing_tmdb = [dict(r) for r in cur.fetchall()]
    
    # 2. Missing poster/backdrop (have tmdb_id but no images)
    cur.execute("""SELECT slug, original_title, titles_json, year, tmdb_id 
                   FROM dramas 
                   WHERE (poster_url IS NULL OR poster_url = '' OR poster_url LIKE '%placeholder%')
                   AND tmdb_id IS NOT NULL""")
    missing_images = [dict(r) for r in cur.fetchall()]

    # 3. All dramas need trailer check
    cur.execute("SELECT slug, original_title, titles_json, year, tmdb_id FROM dramas")
    all_dramas = [dict(r) for r in cur.fetchall()]

    # Load existing trailers
    try:
        with open(TRAILERS_PATH, 'r') as f:
            trailers = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        trailers = {}

    print(f"=== Enrichment Summary ===")
    print(f"Missing TMDB ID: {len(missing_tmdb)}")
    print(f"Missing images (have tmdb_id): {len(missing_images)}")
    print(f"Total dramas for trailer check: {len(all_dramas)}")
    print()

    # Step 1: Get TMDB IDs for dramas without them
    print("=== Step 1: Fetching TMDB IDs ===")
    for drama in missing_tmdb:
        slug = drama['slug']
        title = drama['original_title']
        
        # Parse titles_json for English/Chinese titles
        en_title = title
        zh_title = title
        try:
            titles = json.loads(drama['titles_json'] or '{}')
            if titles.get('en'):
                en_title = titles['en']
            if titles.get('zh'):
                zh_title = titles['zh']
        except:
            pass

        print(f"  {slug} ({en_title} / {zh_title})...")
        
        params = f"title={urllib.request.quote(en_title)}&zh_title={urllib.request.quote(zh_title)}"
        if drama.get('year'):
            params += f"&year={drama['year']}"
        
        data = fetch_json(f"{VERCEL_BASE}?{params}")
        if data and data.get('found'):
            tmdb_id = data['tmdb_id']
            poster_url = data.get('poster_url') or ''
            backdrop_url = data.get('backdrop_url') or ''
            
            # Update DB
            cur.execute("UPDATE dramas SET tmdb_id = ?, poster_url = ?, backdrop_url = ? WHERE slug = ?",
                       (tmdb_id, poster_url, backdrop_url, slug))
            conn.commit()
            print(f"    ✅ tmdb_id={tmdb_id}, poster={'✅' if poster_url else '❌'}, backdrop={'✅' if backdrop_url else '❌'}")
            
            # Save trailer if found
            if data.get('trailer_key'):
                trailers[slug] = data['trailer_key']
                print(f"    🎬 trailer: {data['trailer_key']}")
        else:
            print(f"    ❌ Not found on TMDB")
        
        time.sleep(0.5)  # Rate limiting

    # Step 2: Get images for dramas with tmdb_id but missing images
    print("\n=== Step 2: Fetching missing images ===")
    for drama in missing_images:
        slug = drama['slug']
        title = drama['original_title']
        
        en_title = title
        zh_title = title
        try:
            titles = json.loads(drama['titles_json'] or '{}')
            if titles.get('en'):
                en_title = titles['en']
            if titles.get('zh'):
                zh_title = titles['zh']
        except:
            pass

        print(f"  {slug} ({en_title})...")
        
        params = f"title={urllib.request.quote(en_title)}&zh_title={urllib.request.quote(zh_title)}"
        if drama.get('year'):
            params += f"&year={drama['year']}"
        
        data = fetch_json(f"{VERCEL_BASE}?{params}")
        if data and data.get('found'):
            poster_url = data.get('poster_url') or ''
            backdrop_url = data.get('backdrop_url') or ''
            
            cur.execute("UPDATE dramas SET poster_url = ?, backdrop_url = ? WHERE slug = ?",
                       (poster_url, backdrop_url, slug))
            conn.commit()
            print(f"    poster={'✅' if poster_url else '❌'}, backdrop={'✅' if backdrop_url else '❌'}")
            
            if data.get('trailer_key') and slug not in trailers:
                trailers[slug] = data['trailer_key']
        else:
            print(f"    ❌ Not found")
        
        time.sleep(0.5)

    # Step 3: Check trailers for all dramas
    print("\n=== Step 3: Fetching trailers ===")
    # Only check dramas that don't have a trailer yet
    cur.execute("SELECT slug, original_title, titles_json, year, tmdb_id FROM dramas")
    all_dramas = [dict(r) for r in cur.fetchall()]
    
    for drama in all_dramas:
        slug = drama['slug']
        if slug in trailers:
            continue  # Already have trailer
        
        title = drama['original_title']
        en_title = title
        zh_title = title
        try:
            titles = json.loads(drama['titles_json'] or '{}')
            if titles.get('en'):
                en_title = titles['en']
            if titles.get('zh'):
                zh_title = titles['zh']
        except:
            pass

        print(f"  {slug} ({en_title})...")
        
        params = f"title={urllib.request.quote(en_title)}&zh_title={urllib.request.quote(zh_title)}"
        if drama.get('year'):
            params += f"&year={drama['year']}"
        
        data = fetch_json(f"{VERCEL_BASE}?{params}")
        if data and data.get('trailer_key'):
            trailers[slug] = data['trailer_key']
            print(f"    🎬 trailer: {data['trailer_key']}")
        else:
            print(f"    ❌ No trailer found on TMDB")
        
        time.sleep(0.5)

    # Save trailers JSON
    with open(TRAILERS_PATH, 'w') as f:
        json.dump(trailers, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Summary ===")
    print(f"Trailers found: {len(trailers)}/{len(all_dramas)}")
    print(f"Saved to {TRAILERS_PATH}")
    
    # Print dramas still missing trailers
    missing_trailers = [d['slug'] for d in all_dramas if d['slug'] not in trailers]
    if missing_trailers:
        print(f"\nStill missing trailers ({len(missing_trailers)}):")
        for slug in missing_trailers:
            print(f"  - {slug}")

    conn.close()

if __name__ == "__main__":
    main()
