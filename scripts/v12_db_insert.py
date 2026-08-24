#!/usr/bin/env python3
"""
CDrama Database v12.0 - Phase 2: JSON -> DB Insert
===================================================
Reads data/v12_tmdb_results.json and inserts into data/cdrama.db

Run from sandbox (no internet needed).
"""

import sqlite3
import json
import re
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
JSON_PATH = os.path.join(PROJECT_DIR, "data", "v12_tmdb_results.json")
DB_PATH = os.path.join(PROJECT_DIR, "data", "cdrama.db")

def make_actor_slug(name):
    """Create URL-friendly slug from actor name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug

def get_existing_data(conn):
    """Get existing TMDB IDs and actor info from DB."""
    c = conn.cursor()
    
    # Existing drama TMDB IDs
    c.execute("SELECT tmdb_id FROM dramas")
    existing_tmdb_ids = {row[0] for row in c.fetchall()}
    
    # Existing drama slugs
    c.execute("SELECT slug FROM dramas")
    existing_slugs = {row[0] for row in c.fetchall()}
    
    # Existing actors by name (lowercase)
    c.execute("SELECT id, name, slug, dramas_json, tmdb_person_id, full_filmography_json FROM actors")
    existing_actors = {}
    for row in c.fetchall():
        existing_actors[row[1].lower()] = {
            "id": row[0],
            "name": row[1],
            "slug": row[2],
            "dramas_json": json.loads(row[3]) if row[3] else [],
            "tmdb_person_id": row[4],
            "full_filmography_json": json.loads(row[5]) if row[5] else [],
        }
    
    return existing_tmdb_ids, existing_slugs, existing_actors

def insert_dramas(conn, drama_records, existing_tmdb_ids, existing_slugs):
    """Insert new dramas into database."""
    inserted = []
    skipped = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for drama in drama_records:
        tmdb_id = drama["tmdb_id"]
        
        # Skip if already in DB
        if tmdb_id in existing_tmdb_ids:
            skipped.append({"title": drama.get("titles_json", {}).get("en", ""), "reason": f"tmdb_id={tmdb_id} already in DB"})
            continue
        
        slug = drama["slug"]
        # Ensure slug uniqueness
        if slug in existing_slugs:
            slug = f"{slug}-{drama['year']}"
        if slug in existing_slugs:
            slug = f"{slug}-{tmdb_id}"
        
        # Build synopses_json - only EN for now, VI/TH/ID will be filled by DeepL later
        synopsis_en = drama.get("synopsis_en", "")
        synopses = {"en": synopsis_en, "zh": "", "vi": "", "th": "", "id": ""}
        synopses_json = json.dumps(synopses, ensure_ascii=False)
        
        titles_json = json.dumps(drama.get("titles_json", {}), ensure_ascii=False)
        genres_json = json.dumps(drama.get("genres", []))
        mood_tags_json = json.dumps(drama.get("mood_tags", []))
        streaming_json = json.dumps(drama.get("streaming_json", {}), ensure_ascii=False)
        
        # Tags: empty for now
        tags_json = json.dumps([])
        
        # Similar dramas: null initially, will be calculated later
        similar_dramas_json = None
        
        # Embedding: null initially
        embedding_json = None
        
        try:
            conn.execute("""
                INSERT INTO dramas (slug, tmdb_id, original_title, original_language, 
                                   titles_json, synopses_json, genres, tags, mood_tags,
                                   rating, year, episodes, status, poster_url, backdrop_url,
                                   similar_dramas_json, streaming_json, embedding_json,
                                   created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                slug, tmdb_id, drama.get("original_title", ""),
                drama.get("original_language", "zh"),
                titles_json, synopses_json, genres_json, tags_json, mood_tags_json,
                drama.get("rating", 0), drama.get("year", 0),
                drama.get("episodes", 0), drama.get("status", "Unknown"),
                drama.get("poster_url", ""), drama.get("backdrop_url", ""),
                similar_dramas_json, streaming_json, embedding_json,
                now, now
            ))
            inserted.append({"slug": slug, "tmdb_id": tmdb_id, "title": drama.get("titles_json", {}).get("en", "")})
            existing_slugs.add(slug)
            existing_tmdb_ids.add(tmdb_id)
        except Exception as e:
            skipped.append({"title": drama.get("titles_json", {}).get("en", ""), "reason": str(e)})
    
    return inserted, skipped

def update_actors(conn, actor_records, drama_records, existing_actors):
    """Insert new actors and update existing actors' dramas_json."""
    inserted_actors = []
    updated_actors = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Build a mapping: tmdb_id -> drama slug for quick lookup
    tmdb_to_slug = {}
    for d in drama_records:
        tmdb_to_slug[d["tmdb_id"]] = d["slug"]
    
    # Build a mapping: actor tmdb_person_id -> list of (drama_slug, character)
    actor_drama_map = {}
    for d in drama_records:
        for c in d.get("cast", []):
            pid = c.get("tmdb_person_id")
            if pid:
                if pid not in actor_drama_map:
                    actor_drama_map[pid] = []
                actor_drama_map[pid].append({
                    "slug": d["slug"],
                    "character": c.get("character", ""),
                    "poster_url": f"https://image.tmdb.org/t/p/w500{d.get('poster_url', '')}" if d.get("poster_url") else ""
                })
    
    for actor in actor_records:
        pid = actor["tmdb_person_id"]
        name = actor["name"]
        name_lower = name.lower()
        
        # Build new drama entries for this actor
        new_drama_entries = actor_drama_map.get(pid, [])
        
        if name_lower in existing_actors:
            # Update existing actor
            existing = existing_actors[name_lower]
            existing_dramas = existing["dramas_json"]
            
            # Add new drama entries that aren't already there
            existing_slugs_set = {d["slug"] for d in existing_dramas}
            for entry in new_drama_entries:
                if entry["slug"] not in existing_slugs_set:
                    existing_dramas.append(entry)
                    existing_slugs_set.add(entry["slug"])
            
            # Update full_filmography_json - mark is_in_our_db for our dramas
            full_filmography = existing.get("full_filmography_json", [])
            our_tmdb_ids = {d["tmdb_id"] for d in drama_records}
            for ff in full_filmography:
                if ff.get("id") in our_tmdb_ids:
                    ff["is_in_our_db"] = True
            
            conn.execute("""
                UPDATE actors SET dramas_json = ?, full_filmography_json = ?, updated_at = ?
                WHERE id = ?
            """, (
                json.dumps(existing_dramas, ensure_ascii=False),
                json.dumps(full_filmography, ensure_ascii=False),
                now, existing["id"]
            ))
            updated_actors.append({"name": name, "added_dramas": len(new_drama_entries)})
        else:
            # Insert new actor
            slug = make_actor_slug(name)
            # Ensure slug uniqueness
            base_slug = slug
            counter = 1
            while any(a["slug"] == slug for a in existing_actors.values()):
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            photo_url = ""
            if actor.get("profile_path"):
                photo_url = f"https://image.tmdb.org/t/p/w300{actor['profile_path']}"
            
            names_json = json.dumps({"en": name, "zh": ""}, ensure_ascii=False)
            
            # Build dramas_json
            dramas_json = json.dumps(new_drama_entries, ensure_ascii=False)
            
            # Build full_filmography_json from TV credits
            tv_cast = actor.get("tv_cast", [])
            our_tmdb_ids_set = {d["tmdb_id"] for d in drama_records}
            full_filmography = []
            for tc in tv_cast:
                full_filmography.append({
                    "id": tc.get("tmdb_id"),
                    "name": tc.get("name", ""),
                    "character": tc.get("character", ""),
                    "episode_count": tc.get("episode_count", 0),
                    "first_air_date": tc.get("first_air_date", ""),
                    "vote_average": tc.get("vote_average", 0),
                    "poster_path": tc.get("poster_path", ""),
                    "is_in_our_db": tc.get("tmdb_id") in our_tmdb_ids_set,
                })
            
            # Also add drama entries that might not be in tv_cast
            fc_tmdb_ids = {ff["id"] for ff in full_filmography}
            for entry in new_drama_entries:
                # Find the tmdb_id for this drama
                for d in drama_records:
                    if d["slug"] == entry["slug"] and d["tmdb_id"] not in fc_tmdb_ids:
                        full_filmography.append({
                            "id": d["tmdb_id"],
                            "name": d.get("titles_json", {}).get("en", ""),
                            "character": entry.get("character", ""),
                            "episode_count": d.get("episodes", 0),
                            "first_air_date": "",
                            "vote_average": d.get("rating", 0),
                            "poster_path": d.get("poster_url", ""),
                            "is_in_our_db": True,
                        })
                        break
            
            # Bio
            bio_en = actor.get("biography_en", "")
            bio_json = json.dumps({"en": bio_en}, ensure_ascii=False) if bio_en else json.dumps({"en": ""})
            
            # Also known as
            also_known_as = json.dumps(actor.get("also_known_as", []), ensure_ascii=False)
            
            # Photos
            photos_json = json.dumps(actor.get("photos", []))
            
            # Full filmography
            full_filmography_json_str = json.dumps(full_filmography, ensure_ascii=False)
            
            # Collaborations: empty initially, will be calculated later
            collaborations_json = json.dumps([])
            
            try:
                c = conn.execute("""
                    INSERT INTO actors (slug, name, names_json, photo_url, bio_json, 
                                       dramas_json, collaborations_json, created_at, updated_at,
                                       tmdb_person_id, birthday, deathday, birthplace,
                                       also_known_as, gender, known_for_department,
                                       photos_json, full_filmography_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    slug, name, names_json, photo_url, bio_json,
                    dramas_json, collaborations_json, now, now,
                    pid, actor.get("birthday"), actor.get("deathday"),
                    actor.get("birthplace", ""),
                    also_known_as, actor.get("gender", 0),
                    actor.get("known_for_department", "Acting"),
                    photos_json, full_filmography_json_str
                ))
                new_id = c.lastrowid
                inserted_actors.append({"name": name, "slug": slug, "id": new_id})
                existing_actors[name_lower] = {
                    "id": new_id, "name": name, "slug": slug,
                    "dramas_json": new_drama_entries,
                    "tmdb_person_id": pid,
                    "full_filmography_json": full_filmography,
                }
            except Exception as e:
                print(f"  [ERROR] Failed to insert actor {name}: {e}")
    
    return inserted_actors, updated_actors

def update_extra_cast(conn, extra_cast_records, existing_actors):
    """Update existing actors' dramas_json for extra cast entries (e.g., #41 Rise of Phoenixes)."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated = 0
    
    for ec in extra_cast_records:
        tmdb_id = ec["tmdb_id"]
        
        # Get the drama slug from DB
        c = conn.cursor()
        c.execute("SELECT slug FROM dramas WHERE tmdb_id = ?", (tmdb_id,))
        row = c.fetchone()
        if not row:
            print(f"  [WARN] Drama tmdb_id={tmdb_id} not found in DB, skipping extra cast")
            continue
        drama_slug = row[0]
        
        for cast_member in ec["cast"]:
            name = cast_member.get("name", "")
            name_lower = name.lower()
            
            if name_lower in existing_actors:
                existing = existing_actors[name_lower]
                dramas_list = existing["dramas_json"]
                
                # Check if this drama is already in their dramas_json
                if not any(d["slug"] == drama_slug for d in dramas_list):
                    dramas_list.append({
                        "slug": drama_slug,
                        "character": cast_member.get("character", ""),
                        "poster_url": ""
                    })
                    
                    conn.execute("""
                        UPDATE actors SET dramas_json = ?, updated_at = ?
                        WHERE id = ?
                    """, (
                        json.dumps(dramas_list, ensure_ascii=False),
                        now, existing["id"]
                    ))
                    updated += 1
    
    return updated

def main():
    if not os.path.exists(JSON_PATH):
        print(f"ERROR: JSON file not found at {JSON_PATH}")
        print("Please run v12_tmdb_fetch_only.py first to generate the data.")
        sys.exit(1)
    
    print("=" * 60)
    print("CDrama Database v12.0 - Phase 2: JSON -> DB Insert")
    print("=" * 60)
    
    # Load JSON
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Loaded: {len(data['dramas'])} dramas, {len(data['actors'])} actors, {len(data['extra_cast'])} extra cast")
    
    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=DELETE")  # Avoid WAL locking issues
    
    # Get existing data
    existing_tmdb_ids, existing_slugs, existing_actors = get_existing_data(conn)
    print(f"Existing: {len(existing_tmdb_ids)} dramas, {len(existing_actors)} actors")
    
    # Insert dramas
    print("\n--- Inserting dramas ---")
    inserted_dramas, skipped_dramas = insert_dramas(conn, data["dramas"], existing_tmdb_ids, existing_slugs)
    conn.commit()
    print(f"Inserted: {len(inserted_dramas)} dramas")
    if skipped_dramas:
        print(f"Skipped: {len(skipped_dramas)}")
        for s in skipped_dramas:
            print(f"  - {s['title']}: {s['reason']}")
    
    # Update actors
    print("\n--- Updating actors ---")
    inserted_actors, updated_actors = update_actors(conn, data["actors"], data["dramas"], existing_actors)
    conn.commit()
    print(f"Inserted: {len(inserted_actors)} new actors")
    print(f"Updated: {len(updated_actors)} existing actors")
    
    # Update extra cast
    print("\n--- Updating extra cast ---")
    extra_updated = update_extra_cast(conn, data.get("extra_cast", []), existing_actors)
    conn.commit()
    print(f"Updated: {extra_updated} actor-drama links for extra cast")
    
    # Final stats
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM dramas")
    total_dramas = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM actors")
    total_actors = c.fetchone()[0]
    
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Total dramas in DB: {total_dramas}")
    print(f"  Total actors in DB: {total_actors}")
    print(f"  New dramas added: {len(inserted_dramas)}")
    print(f"  New actors added: {len(inserted_actors)}")
    print(f"  Existing actors updated: {len(updated_actors)}")
    print(f"{'=' * 60}")
    
    conn.close()

if __name__ == "__main__":
    main()
