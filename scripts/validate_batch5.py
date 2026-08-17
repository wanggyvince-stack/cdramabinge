#!/usr/bin/env python3
"""
validate_batch5.py — Final validation for all 50 dramas
Checks: synopses, cast, streaming, similar_dramas, titles
"""
import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'data' / 'cdrama.db'
STREAMING_PATH = Path(__file__).parent.parent / 'data' / 'streaming.json'

def validate():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    issues = []
    warnings = []
    
    # 1. Check all dramas exist
    cur = conn.execute("SELECT COUNT(*) FROM dramas")
    total = cur.fetchone()[0]
    print(f"Total dramas: {total}")
    if total != 50:
        issues.append(f"Expected 50 dramas, got {total}")
    
    # 2. Check synopses (at least English)
    cur = conn.execute("SELECT slug, synopses_json FROM dramas")
    empty_synopses = []
    for row in cur.fetchall():
        try:
            synopses = json.loads(row['synopses_json'] or '{}')
            en = synopses.get('en', '')
            if not en or len(en) < 20:
                empty_synopses.append(row['slug'])
        except (json.JSONDecodeError, TypeError):
            empty_synopses.append(row['slug'])
    
    if empty_synopses:
        issues.append(f"Empty/short English synopses ({len(empty_synopses)}): {empty_synopses}")
    else:
        print("✓ All dramas have English synopses")
    
    # 3. Check titles (at least English + Chinese)
    cur = conn.execute("SELECT slug, titles_json FROM dramas")
    incomplete_titles = []
    for row in cur.fetchall():
        try:
            titles = json.loads(row['titles_json'] or '{}')
            en = titles.get('en', '')
            zh = titles.get('zh', '')
            if not en or not zh:
                incomplete_titles.append(row['slug'])
        except (json.JSONDecodeError, TypeError):
            incomplete_titles.append(row['slug'])
    
    if incomplete_titles:
        issues.append(f"Incomplete titles ({len(incomplete_titles)}): {incomplete_titles}")
    else:
        print("✓ All dramas have en+zh titles")
    
    # 4. Check cast (at least 4 actors per drama, from actors table)
    cur = conn.execute("SELECT slug FROM dramas")
    all_drama_slugs = []
    for row in cur.fetchall():
        all_drama_slugs.append(row['slug'])
    
    cur = conn.execute("SELECT name, dramas_json FROM actors")
    drama_cast_count = {slug: 0 for slug in all_drama_slugs}
    for row in cur.fetchall():
        try:
            dramas_list = json.loads(row['dramas_json'] or '[]')
            for d in dramas_list:
                slug = d.get('slug', '')
                if slug in drama_cast_count:
                    drama_cast_count[slug] += 1
        except (json.JSONDecodeError, TypeError):
            pass
    
    no_cast = [s for s, c in drama_cast_count.items() if c == 0]
    low_cast = [(s, c) for s, c in drama_cast_count.items() if 0 < c < 4]
    
    if no_cast:
        warnings.append(f"No cast data ({len(no_cast)}): {no_cast}")
    else:
        print("✓ All dramas have cast data")
    if low_cast:
        warnings.append(f"Low cast count <4 ({len(low_cast)}): {low_cast}")
    
    # 5. Check streaming.json
    with open(str(STREAMING_PATH)) as f:
        streaming = json.load(f)
    
    # streaming.json is a dict with drama slugs as keys
    streaming_slugs = set(streaming.keys()) if isinstance(streaming, dict) else set()
    
    cur = conn.execute("SELECT slug FROM dramas")
    all_slugs = set(row['slug'] for row in cur.fetchall())
    missing_streaming = all_slugs - streaming_slugs
    
    if missing_streaming:
        issues.append(f"Missing streaming data ({len(missing_streaming)}): {sorted(missing_streaming)}")
    else:
        print(f"✓ All {total} dramas have streaming entries")
    
    # 6. Check similar_dramas
    cur = conn.execute("SELECT slug, similar_dramas_json FROM dramas")
    no_similar = []
    for row in cur.fetchall():
        try:
            similar = json.loads(row['similar_dramas_json'] or '[]')
            if len(similar) == 0:
                no_similar.append(row['slug'])
        except (json.JSONDecodeError, TypeError):
            no_similar.append(row['slug'])
    
    if no_similar:
        warnings.append(f"No similar dramas ({len(no_similar)}): {no_similar}")
    else:
        print("✓ All dramas have similar_dramas")
    
    # 7. Check actors table
    cur = conn.execute("SELECT COUNT(*) FROM actors")
    actor_count = cur.fetchone()[0]
    print(f"Total actors: {actor_count}")
    
    # 8. Check genres are valid
    VALID_GENRES = {'romance', 'historical', 'fantasy', 'wuxia', 'xianxia', 'modern', 
                    'thriller', 'comedy', 'drama', 'action', 'mystery', 'sci_fi', 'youth', 'crime'}
    cur = conn.execute("SELECT slug, genres FROM dramas")
    invalid_genres = []
    for row in cur.fetchall():
        try:
            genres = set(json.loads(row['genres'] or '[]'))
            bad = genres - VALID_GENRES
            if bad:
                invalid_genres.append((row['slug'], bad))
        except (json.JSONDecodeError, TypeError):
            pass
    
    if invalid_genres:
        issues.append(f"Invalid genres ({len(invalid_genres)}): {invalid_genres}")
    else:
        print("✓ All genres are valid")
    
    # 9. Check moods are valid
    VALID_MOODS = {'wanna_cry', 'light_fun', 'intense', 'romantic', 'mindbending', 'spooky', 'empowering', 'aesthetic'}
    cur = conn.execute("SELECT slug, mood_tags FROM dramas")
    invalid_moods = []
    for row in cur.fetchall():
        try:
            moods = set(json.loads(row['mood_tags'] or '[]'))
            bad = moods - VALID_MOODS
            if bad:
                invalid_moods.append((row['slug'], bad))
        except (json.JSONDecodeError, TypeError):
            pass
    
    if invalid_moods:
        issues.append(f"Invalid moods ({len(invalid_moods)}): {invalid_moods}")
    else:
        print("✓ All mood tags are valid")
    
    # 10. Check backdrop/poster URLs
    cur = conn.execute("SELECT slug, poster_url, backdrop_url FROM dramas")
    no_poster = []
    no_backdrop = []
    for row in cur.fetchall():
        if not row['poster_url']:
            no_poster.append(row['slug'])
        if not row['backdrop_url']:
            no_backdrop.append(row['slug'])
    
    if no_poster:
        warnings.append(f"No poster URL ({len(no_poster)}): {no_poster[:10]}...")
    if no_backdrop:
        warnings.append(f"No backdrop URL ({len(no_backdrop)}): {no_backdrop[:10]}...")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*60}")
    print(f"Dramas: {total}")
    print(f"Actors: {actor_count}")
    print(f"Streaming entries: {len(streaming)}")
    print(f"Issues: {len(issues)}")
    print(f"Warnings: {len(warnings)}")
    
    if issues:
        print(f"\n🔴 ISSUES:")
        for i in issues:
            print(f"  - {i}")
    
    if warnings:
        print(f"\n🟡 WARNINGS:")
        for w in warnings:
            print(f"  - {w}")
    
    if not issues and not warnings:
        print(f"\n✅ ALL CHECKS PASSED!")
    
    conn.close()
    return len(issues) == 0


if __name__ == '__main__':
    validate()
