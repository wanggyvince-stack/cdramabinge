#!/usr/bin/env python3
"""Batch 3: Insert 35 verified dramas into cdrama.db and update streaming.json"""

import json
import sqlite3
import os

BASE = '/Coze/Drive/CDrama_Database/cdrama-database'
DB_PATH = os.path.join(BASE, 'data/cdrama.db')
JSON_PATH = os.path.join(BASE, 'data/batch2_all_verified.json')
STREAMING_PATH = os.path.join(BASE, 'data/streaming.json')

# Valid genre and mood values (lowercase)
ALL_GENRES = {'romance', 'historical', 'fantasy', 'wuxia', 'xianxia', 'modern',
              'thriller', 'comedy', 'drama', 'action', 'mystery', 'sci_fi', 'youth', 'crime'}
ALL_MOODS = {'wanna_cry', 'light_fun', 'intense', 'romantic', 'mindbending',
             'spooky', 'empowering', 'aesthetic'}

# Platform name normalization
PLATFORM_MAP = {
    'Tencent Video': 'WeTV',
    'Tencent': 'WeTV',
    '爱奇艺': 'iQIYI',
    '优酷': 'Youku',
    '芒果TV': 'Mango TV',
}

# Slug corrections
SLUG_CORRECTIONS = {
    'my-boss': 'you-are-my-glory',
}

# Default genres/moods for second-format records that lack them
# Based on drama content knowledge
DEFAULT_GENRES = {
    'love-and-redemption': ['fantasy', 'romance', 'drama'],
    'my-journey-to-you': ['wuxia', 'action', 'drama'],
    'the-princess-royal': ['historical', 'romance', 'drama'],
    'moonlight-mystique': ['fantasy', 'romance', 'drama'],
    'love-game-in-eastern-fantasy': ['fantasy', 'action', 'drama'],
    'the-prisoner-of-beauty': ['historical', 'romance', 'drama'],
    'fated-hearts': ['historical', 'romance', 'drama'],
    'put-your-head-on-my-shoulder': ['romance', 'comedy', 'youth'],
}

DEFAULT_MOODS = {
    'love-and-redemption': 'romantic',
    'my-journey-to-you': 'intense',
    'the-princess-royal': 'intense',
    'moonlight-mystique': 'romantic',
    'love-game-in-eastern-fantasy': 'intense',
    'the-prisoner-of-beauty': 'romantic',
    'fated-hearts': 'romantic',
    'put-your-head-on-my-shoulder': 'romantic',
}


def normalize_platform(name):
    return PLATFORM_MAP.get(name, name)


def normalize_genres(genres_list):
    """Normalize genres to lowercase valid values."""
    result = []
    for g in genres_list:
        g_lower = g.lower().replace('-', '_').replace(' ', '_')
        # Map common aliases
        if g_lower == 'adventure':
            g_lower = 'action'
        if g_lower in ALL_GENRES:
            if g_lower not in result:
                result.append(g_lower)
        else:
            print(f"  WARNING: Unknown genre '{g}' -> '{g_lower}', skipping")
    return result


def normalize_mood(mood_str):
    m = mood_str.lower().replace('-', '_').replace(' ', '_')
    if m in ALL_MOODS:
        return m
    print(f"  WARNING: Unknown mood '{mood_str}' -> '{m}', defaulting to 'drama'")
    return 'romantic'  # safe default


def build_drama_record(slug, info):
    """Build a drama record dict from the JSON entry."""

    # Handle title fields - two different formats
    if 'original_title' in info:
        # First format: original_title + english_title
        original_title = info['original_title']
        english_title = info.get('english_title', '')
    elif 'chinese_name' in info:
        # Second format: chinese_name + title
        original_title = info['chinese_name']
        english_title = info.get('title', '')
    else:
        original_title = slug
        english_title = slug

    tmdb_id = info.get('tmdb_id')
    year = info.get('year')

    # Genres
    if 'genres' in info and info['genres']:
        genres = normalize_genres(info['genres'])
    elif slug in DEFAULT_GENRES:
        genres = DEFAULT_GENRES[slug]
    else:
        genres = ['drama']

    # Mood
    if 'mood' in info and info['mood']:
        mood = normalize_mood(info['mood'])
    elif slug in DEFAULT_MOODS:
        mood = DEFAULT_MOODS[slug]
    else:
        mood = 'romantic'

    # Platforms / streaming
    if 'platforms' in info and info['platforms']:
        platforms_list = [normalize_platform(p) for p in info['platforms']]
    else:
        platforms_list = []

    # Build titles_json
    titles = {"en": english_title, "zh": original_title, "vi": "", "th": ""}

    # Build synopses_json (empty for now, Batch 4 fills)
    synopses = {"en": "", "zh": "", "vi": "", "th": ""}

    # Build streaming_json
    streaming_platforms = []
    for pname in platforms_list:
        # Use generic URLs for now
        url = ""
        if pname == "Netflix":
            url = "https://www.netflix.com"
        elif pname == "iQIYI":
            url = "https://www.iq.com"
        elif pname == "WeTV":
            url = "https://wetv.vip"
        elif pname == "Youku":
            url = "https://www.youku.com"
        elif pname == "Mango TV":
            url = "https://www.mgtv.com"
        elif pname == "Viki":
            url = "https://www.viki.com"
        streaming_platforms.append({
            "name": pname,
            "url": url,
            "regions": ["global"]
        })

    streaming = {"platforms": streaming_platforms}

    return {
        'slug': slug,
        'tmdb_id': tmdb_id,
        'original_title': original_title,
        'original_language': 'zh',
        'titles_json': json.dumps(titles, ensure_ascii=False),
        'synopses_json': json.dumps(synopses, ensure_ascii=False),
        'genres': json.dumps(genres, ensure_ascii=False),
        'tags': '[]',
        'mood_tags': json.dumps([mood], ensure_ascii=False),
        'rating': None,
        'year': year,
        'episodes': None,
        'status': 'Completed',
        'poster_url': None,
        'backdrop_url': None,
        'similar_dramas_json': '[]',
        'streaming_json': json.dumps(streaming, ensure_ascii=False),
        'embedding_json': None,
    }, streaming


def main():
    # Load verified dramas
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        dramas = json.load(f)

    print(f"Loaded {len(dramas)} dramas from batch2_all_verified.json")

    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing slugs
    existing = set(row[0] for row in cursor.execute("SELECT slug FROM dramas").fetchall())
    print(f"Existing slugs in DB: {len(existing)}")

    # Load existing streaming.json
    if os.path.exists(STREAMING_PATH):
        with open(STREAMING_PATH, 'r', encoding='utf-8') as f:
            streaming_data = json.load(f)
    else:
        streaming_data = {}

    inserted = 0
    skipped = 0

    for original_slug, info in dramas.items():
        # Apply slug corrections
        slug = SLUG_CORRECTIONS.get(original_slug, original_slug)

        # Special correction for my-boss
        if original_slug == 'my-boss':
            info = dict(info)  # copy to avoid mutation
            info['original_title'] = '你是我的荣耀'
            info['english_title'] = 'You Are My Glory'

        # Special correction for perfect-match
        if original_slug == 'perfect-match':
            info = dict(info)
            info['original_title'] = '五福临门'

        # Special correction for love-game-in-eastern-fantasy
        if original_slug == 'love-game-in-eastern-fantasy':
            info = dict(info)
            info['chinese_name'] = '永夜星河'

        if slug in existing:
            print(f"SKIP: {slug} already exists in DB")
            skipped += 1
            continue

        record, streaming_info = build_drama_record(slug, info)

        # Insert into dramas table
        cursor.execute("""
            INSERT INTO dramas (slug, tmdb_id, mdl_id, original_title, original_language,
                titles_json, synopses_json, genres, tags, mood_tags,
                rating, year, episodes, status, poster_url, backdrop_url,
                similar_dramas_json, streaming_json, embedding_json)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record['slug'], record['tmdb_id'], record['original_title'],
            record['original_language'], record['titles_json'],
            record['synopses_json'], record['genres'], record['tags'],
            record['mood_tags'], record['rating'], record['year'],
            record['episodes'], record['status'], record['poster_url'],
            record['backdrop_url'], record['similar_dramas_json'],
            record['streaming_json'], record['embedding_json']
        ))

        # Add to streaming data
        if streaming_info['platforms']:
            streaming_data[slug] = streaming_info

        inserted += 1
        print(f"INSERT: {slug} ({record['original_title']}, {record['year']})")

    conn.commit()

    # Verify count
    total = cursor.execute("SELECT COUNT(*) FROM dramas").fetchone()[0]
    print(f"\n=== SUMMARY ===")
    print(f"Inserted: {inserted}")
    print(f"Skipped (already exists): {skipped}")
    print(f"Total dramas in DB: {total}")

    # Save updated streaming.json
    with open(STREAMING_PATH, 'w', encoding='utf-8') as f:
        json.dump(streaming_data, f, ensure_ascii=False, indent=2)
    print(f"Updated streaming.json with {len(streaming_data)} entries")

    conn.close()
    print("\nDone!")


if __name__ == '__main__':
    main()
