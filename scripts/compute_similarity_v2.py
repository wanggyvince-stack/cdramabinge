#!/usr/bin/env python3
"""
compute_similarity_v2.py — Rule-based similarity for C-drama database
Uses genre overlap, mood overlap, and year proximity to compute similarity scores.
No ML dependencies required.
"""
import json
import sqlite3
import math
from pathlib import Path
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / 'data' / 'cdrama.db'
TOP_K = 15


def load_all_dramas(conn):
    """Load all dramas with their attributes."""
    conn.row_factory = sqlite3.Row
    cursor = conn.execute("""
        SELECT id, slug, original_title, year, genres, mood_tags, 
               titles_json, synopses_json
        FROM dramas
    """)
    dramas = []
    for row in cursor:
        try:
            genres = set(json.loads(row['genres'] or '[]'))
        except (json.JSONDecodeError, TypeError):
            genres = set()
        try:
            moods = set(json.loads(row['mood_tags'] or '[]'))
        except (json.JSONDecodeError, TypeError):
            moods = set()
        
        dramas.append({
            'id': row['id'],
            'slug': row['slug'],
            'title': row['original_title'],
            'year': row['year'],
            'genres': genres,
            'moods': moods,
        })
    return dramas


def jaccard_similarity(set_a, set_b):
    """Compute Jaccard similarity between two sets."""
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0


def year_proximity_score(year_a, year_b):
    """Score based on year proximity. Closer years = higher score."""
    if not year_a or not year_b:
        return 0.0
    diff = abs(year_a - year_b)
    if diff == 0:
        return 0.15
    elif diff <= 1:
        return 0.12
    elif diff <= 2:
        return 0.08
    elif diff <= 5:
        return 0.04
    else:
        return 0.0


# Genre affinity groups - dramas within same group get a small bonus
GENRE_AFFINITY = {
    'romance': 'romance_cluster',
    'historical': 'historical_cluster',
    'fantasy': 'fantasy_cluster',
    'wuxia': 'martial_cluster',
    'xianxia': 'fantasy_cluster',
    'modern': 'modern_cluster',
    'thriller': 'thriller_cluster',
    'comedy': 'comedy_cluster',
    'drama': 'drama_cluster',
    'action': 'action_cluster',
    'mystery': 'thriller_cluster',
    'sci_fi': 'thriller_cluster',
    'youth': 'youth_cluster',
    'crime': 'thriller_cluster',
}


def genre_affinity_bonus(genres_a, genres_b):
    """Bonus for sharing genre affinity clusters."""
    clusters_a = set(GENRE_AFFINITY.get(g, g) for g in genres_a)
    clusters_b = set(GENRE_AFFINITY.get(g, g) for g in genres_b)
    shared = len(clusters_a & clusters_b)
    return min(shared * 0.03, 0.10)


def compute_pairwise_similarity(drama_a, drama_b):
    """Compute overall similarity between two dramas."""
    # Genre overlap (weight: 0.50)
    genre_sim = jaccard_similarity(drama_a['genres'], drama_b['genres'])
    genre_score = genre_sim * 0.50
    
    # Mood overlap (weight: 0.25)
    mood_sim = jaccard_similarity(drama_a['moods'], drama_b['moods'])
    mood_score = mood_sim * 0.25
    
    # Year proximity (weight: 0.15)
    year_score = year_proximity_score(drama_a['year'], drama_b['year'])
    
    # Genre affinity bonus (weight: 0.10)
    affinity_score = genre_affinity_bonus(drama_a['genres'], drama_b['genres'])
    
    total = genre_score + mood_score + year_score + affinity_score
    return round(total, 4)


def compute_all_similarities():
    """Compute similarity for all dramas and update database."""
    conn = sqlite3.connect(str(DB_PATH))
    dramas = load_all_dramas(conn)
    
    print(f"Computing similarity for {len(dramas)} dramas...")
    
    # Build similarity matrix
    updated = 0
    for i, drama_a in enumerate(dramas):
        similarities = []
        
        for j, drama_b in enumerate(dramas):
            if i == j:
                continue
            score = compute_pairwise_similarity(drama_a, drama_b)
            if score > 0.01:  # Only include meaningful similarities
                similarities.append({
                    'id': drama_b['id'],
                    'slug': drama_b['slug'],
                    'title': drama_b['title'],
                    'score': score,
                })
        
        # Sort by score descending, take top K
        similarities.sort(key=lambda x: x['score'], reverse=True)
        top_similar = similarities[:TOP_K]
        
        # Update database
        conn.execute("""
            UPDATE dramas SET similar_dramas_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(top_similar), drama_a['id']))
        updated += 1
    
    conn.commit()
    conn.close()
    
    print(f"Updated {updated} dramas with similarity data")
    
    # Log sample results
    print_sample_results()


def print_sample_results():
    """Print sample similarity results for quality check."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    # Pick a few diverse dramas to show
    sample_slugs = ['the-first-frost', 'the-double', 'go-ahead', 'love-o2o', 'my-journey-to-you']
    
    print("\n" + "=" * 60)
    print("SAMPLE SIMILARITY RESULTS (Quality Check)")
    print("=" * 60)
    
    for slug in sample_slugs:
        cursor = conn.execute("""
            SELECT slug, original_title, genres, mood_tags, similar_dramas_json
            FROM dramas WHERE slug = ?
        """, (slug,))
        row = cursor.fetchone()
        if not row:
            continue
        
        genres = json.loads(row['genres'] or '[]')
        moods = json.loads(row['mood_tags'] or '[]')
        similar = json.loads(row['similar_dramas_json'] or '[]')
        
        print(f"\n{row['original_title']} ({slug})")
        print(f"  Genres: {genres}")
        print(f"  Moods: {moods}")
        print(f"  Top 5 similar:")
        for s in similar[:5]:
            print(f"    → {s['title']} ({s['slug']}) score={s['score']}")
    
    # Stats
    cursor = conn.execute("SELECT COUNT(*) as cnt FROM dramas")
    total = cursor.fetchone()['cnt']
    
    cursor = conn.execute("""
        SELECT similar_dramas_json FROM dramas
        WHERE similar_dramas_json IS NOT NULL
    """)
    has_similar = 0
    total_links = 0
    for row in cursor:
        data = json.loads(row['similar_dramas_json'] or '[]')
        if len(data) > 0:
            has_similar += 1
            total_links += len(data)
    
    print(f"\n{'=' * 60}")
    print(f"STATS:")
    print(f"  Total dramas: {total}")
    print(f"  Dramas with similar: {has_similar}")
    print(f"  Average links per drama: {total_links / max(has_similar, 1):.1f}")
    
    conn.close()


def main():
    print("=" * 60)
    print("CDrama Database - Similarity Computation v2 (Rule-based)")
    print("=" * 60)
    
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return
    
    compute_all_similarities()
    print("\nDone!")


if __name__ == '__main__':
    main()
