"""
Update actor photo_url in local SQLite DB using data from Vercel's 
/api/enrich-actor-photos endpoint (which proxies TMDB credits API).

Matching logic (priority order):
1. Match by Chinese name: actor.names_json.zh == TMDB actor_name
2. Match by English name: actor.names_json.en == TMDB actor_name  
3. Match by (slug, character) if character is in Chinese

Usage: python scripts/update_actor_photos.py
"""

import json
import sqlite3
import os
import urllib.request

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'cdrama.db')
API_URL = "https://cdramabinge.com/api/enrich-actor-photos"

def fetch_api_data():
    """Fetch cast photo data from Vercel API route."""
    print(f"Fetching data from {API_URL}...")
    req = urllib.request.Request(API_URL, headers={'User-Agent': 'CDramaBot/1.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
    print(f"  Dramas with TMDB: {data['total_dramas']}")
    print(f"  Dramas with cast data: {data['dramas_with_cast']}")
    print(f"  Total cast entries: {data['total_cast_entries']}")
    if data.get('errors'):
        print(f"  Errors: {data['errors']}")
    return data['data']

def build_name_lookup(cast_data):
    """Build lookup by actor name: {actor_name: profile_url}
    TMDB returns Chinese names for Chinese actors.
    """
    lookup = {}
    for slug, cast_list in cast_data.items():
        for entry in cast_list:
            actor_name = entry.get('actor_name', '').strip()
            if actor_name and entry.get('profile_url'):
                # Store first available photo for each actor name
                if actor_name not in lookup:
                    lookup[actor_name] = entry['profile_url']
    return lookup

def build_character_lookup(cast_data):
    """Build lookup: {(slug, character): profile_url} for Chinese characters."""
    lookup = {}
    for slug, cast_list in cast_data.items():
        for entry in cast_list:
            character = entry.get('character', '').strip()
            if character and entry.get('profile_url'):
                # Check if character contains Chinese characters
                has_chinese = any('\u4e00' <= c <= '\u9fff' for c in character)
                if has_chinese:
                    lookup[(slug, character)] = entry['profile_url']
    return lookup

def update_db(name_lookup, char_lookup):
    """Update actor photo_url in SQLite DB."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all actors without photo
    cursor.execute("SELECT id, slug, name, names_json, dramas_json FROM actors WHERE photo_url IS NULL OR photo_url = ''")
    actors_no_photo = cursor.fetchall()
    
    updated = 0
    match_method = {'name_zh': 0, 'name_en': 0, 'character': 0}
    unmatched = []
    
    for actor in actors_no_photo:
        actor_id = actor['id']
        actor_slug = actor['slug']
        actor_name = actor['name']
        
        # Parse names_json
        try:
            names = json.loads(actor['names_json'] or '{}')
        except (json.JSONDecodeError, TypeError):
            names = {}
        name_zh = names.get('zh', '').strip()
        name_en = names.get('en', '').strip()
        
        photo_url = None
        method = None
        
        # Method 1: Match by Chinese name
        if name_zh and name_zh in name_lookup:
            photo_url = name_lookup[name_zh]
            method = 'name_zh'
        
        # Method 2: Match by English name
        elif name_en and name_en in name_lookup:
            photo_url = name_lookup[name_en]
            method = 'name_en'
        
        # Method 3: Match by (slug, character) with Chinese character names
        if not photo_url:
            try:
                dramas_list = json.loads(actor['dramas_json'] or '[]')
            except (json.JSONDecodeError, TypeError):
                dramas_list = []
            
            for drama_entry in dramas_list:
                if isinstance(drama_entry, dict):
                    slug = drama_entry.get('slug', '')
                    character = drama_entry.get('character', '').strip()
                    key = (slug, character)
                    if key in char_lookup:
                        photo_url = char_lookup[key]
                        method = 'character'
                        break
        
        if photo_url:
            cursor.execute("UPDATE actors SET photo_url = ? WHERE id = ?", (photo_url, actor_id))
            updated += 1
            match_method[method] = match_method.get(method, 0) + 1
            print(f"  ✅ [{method}] {actor_name} ({actor_slug})")
        else:
            unmatched.append((actor_slug, actor_name, name_zh, name_en))
    
    conn.commit()
    
    # Summary
    cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN photo_url IS NOT NULL AND photo_url != '' THEN 1 ELSE 0 END) as with_photo FROM actors")
    stats = cursor.fetchone()
    
    conn.close()
    
    print(f"\n{'='*50}")
    print(f"Updated: {updated} actors")
    print(f"  By Chinese name: {match_method.get('name_zh', 0)}")
    print(f"  By English name: {match_method.get('name_en', 0)}")
    print(f"  By character: {match_method.get('character', 0)}")
    print(f"Still unmatched: {len(unmatched)} actors")
    print(f"DB stats: {stats['with_photo']}/{stats['total']} actors have photos")
    
    if unmatched:
        print(f"\nUnmatched actors (first 30):")
        for slug, name, zh, en in unmatched[:30]:
            print(f"  ❌ {name} ({slug}) zh={zh} en={en}")
    
    return updated

if __name__ == '__main__':
    cast_data = fetch_api_data()
    name_lookup = build_name_lookup(cast_data)
    char_lookup = build_character_lookup(cast_data)
    print(f"\nName lookup: {len(name_lookup)} actor names → photo_url")
    print(f"Character lookup: {len(char_lookup)} (slug, character) → photo_url\n")
    update_db(name_lookup, char_lookup)
