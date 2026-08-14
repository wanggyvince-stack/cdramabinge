#!/usr/bin/env python3
"""
populate_backdrop_direct.py — Directly populate backdrop_url with pre-verified TMDB data.

This script uses TMDB backdrop paths that were verified from third-party TMDB data mirrors.
It also corrects TMDB IDs where mismatches were found.

No network access required. Idempotent.
"""

import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / 'data' / 'cdrama.db'
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"

# Pre-verified backdrop data from TMDB
# Format: slug -> (backdrop_path, correct_tmdb_id_or_None)
# TMDB IDs were verified via duafile.com and watch-list.me (both mirror TMDB data)
VERIFIED_DATA = {
    # Verified via duafile.com, watch-list.me, good.film (all mirror TMDB data)

    'the-untamed': ('/mthKQh5uBwRnwJOafA1xfGOoj3J.jpg', 90761),
    # DB had tmdb_id=86543 → correct is 90761 (verified via duafile.com)

    'word-of-honor': ('/xWBD0BqiPsmXBZNeT6UMCMdMXvX.jpg', 119362),
    # DB had tmdb_id=118735 → correct is 119362 (verified via duafile.com + watch-list.me)

    'story-of-minglan': ('/64YigOkGkBVUvWo9WpR45y4zjuf.jpg', 81502),
    # TMDB ID 81502 confirmed correct (verified via watch-list.me)

    'the-longest-promise': ('/lCWgWkYsUTTXlQUGmoQyAAdvgeD.jpg', 130270),
    # DB had tmdb_id=137206 → correct is 130270 (verified via watch-list.me)

    'joy-of-life': ('/4eNmWhBfDfAj8qbKHPgW394rAK8.jpg', 95842),
    # DB had tmdb_id=94885 → correct is 95842 (verified via duafile.com)

    'hidden-love': ('/wQlJJJ50gKphCci0SmoetUXmJN4.jpg', 210733),
    # DB had tmdb_id=222026 → correct is 210733 (verified via good.film)

    'a-little-reunion': ('/1k5qFZOovnhpTvmbliyfPoYs0uj.jpg', 93088),
    # TMDB ID 93088 confirmed correct (verified via good.film)

    'love-like-the-galaxy': ('/wNSLw756U5JQSpG6POYxHKL2KDH.jpg', 137870),
    # TMDB ID 137870 confirmed correct (verified via good.film)

    'story-of-kunning': ('/3OLeiLbTdNFovd2zyBn2xgR8UWY.jpg', 207197),
    # TMDB ID 207197 confirmed correct (verified via good.film)

    'nirvana-in-fire': ('/4pBohJyXnAf7yvzyMTD1953RIjY.jpg', 64197),
    # DB had tmdb_id=63333 → TMDB 63333 = "The Last Kingdom" (WRONG)
    # Correct ID: 64197 (verified via good.film/title/tv/64197/nirvana-in-fire)

    'ashes-of-love': ('/sAWkRhtxpzhkcaijUThj6V6rb6u.jpg', 80884),
    # DB had tmdb_id=80748 → TMDB 80748 = "FBI" (WRONG)
    # Correct ID: 80884 (verified via watch-list.me/tv/ashes-of-love-80884)

    'love-between-fairy-and-devil': ('/pECcUE53TjkrR2VsAgF7JICzH7k.jpg', 130368),
    # DB had tmdb_id=209008 → not found on TMDB mirrors (WRONG)
    # Correct ID: 130368 (verified via good.film/title/tv/130368/love-between-fairy-and-devil)

    'meet-yourself': ('/4CDbPsvJUTbFq78OMg9SDe5Mkfr.jpg', 216424),
    # DB had tmdb_id=221215 → TMDB 221215 = "Tehdas" Finnish drama (WRONG)
    # Correct ID: 216424 (verified via good.film/title/tv/216424/meet-yourself)

    'the-knockout': ('/i4xRsWEAwGgL5wMm8jrBbxxXKEI.jpg', 210757),
    # DB had tmdb_id=217536 → correct is 210757 (verified via watch-list.me)

    'reset': ('/diTz0umqocpeFa0g4Q4DiMw84DF.jpg', 155441),
    # DB had tmdb_id=197036 → TMDB 197036 = "Sexy Alm" German comedy (WRONG)
    # Correct ID: 155441 (verified via good.film/title/tv/155441/reset)
}


def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    print(f"Database: {DB_PATH}")
    print(f"Updating {len(VERIFIED_DATA)} dramas with verified backdrop data...\n")

    updated = 0
    id_corrections = []

    for slug, (backdrop_path, correct_tmdb_id) in VERIFIED_DATA.items():
        full_url = f"{TMDB_IMAGE_BASE}{backdrop_path}"

        # Get current state
        cursor.execute(
            "SELECT tmdb_id, backdrop_url FROM dramas WHERE slug = ?", (slug,)
        )
        row = cursor.fetchone()
        if not row:
            print(f"  SKIP {slug}: not found in database")
            continue

        current_tmdb_id, current_backdrop = row

        # Check for TMDB ID correction
        needs_id_correction = (current_tmdb_id != correct_tmdb_id)
        if needs_id_correction:
            id_corrections.append((slug, current_tmdb_id, correct_tmdb_id))

        # Check if update needed
        needs_backdrop_update = (current_backdrop != full_url)

        if not needs_id_correction and not needs_backdrop_update:
            print(f"  OK   {slug}: already up to date")
            continue

        # Update
        if needs_id_correction and needs_backdrop_update:
            cursor.execute(
                "UPDATE dramas SET backdrop_url = ?, tmdb_id = ?, updated_at = datetime('now') WHERE slug = ?",
                (full_url, correct_tmdb_id, slug)
            )
            print(f"  UPD  {slug}: backdrop + TMDB ID corrected ({current_tmdb_id} → {correct_tmdb_id})")
        elif needs_id_correction:
            cursor.execute(
                "UPDATE dramas SET tmdb_id = ?, updated_at = datetime('now') WHERE slug = ?",
                (correct_tmdb_id, slug)
            )
            print(f"  UPD  {slug}: TMDB ID corrected ({current_tmdb_id} → {correct_tmdb_id})")
        else:
            cursor.execute(
                "UPDATE dramas SET backdrop_url = ?, updated_at = datetime('now') WHERE slug = ?",
                (full_url, slug)
            )
            print(f"  UPD  {slug}: backdrop updated")

        updated += 1

    conn.commit()

    # Summary
    print(f"\n{'='*60}")
    print(f"Updated: {updated} dramas")

    if id_corrections:
        print(f"\nTMDB ID corrections ({len(id_corrections)}):")
        for slug, old_id, new_id in id_corrections:
            print(f"  {slug}: {old_id} → {new_id}")

    # Final status
    print(f"\nBackdrop status:")
    cursor.execute("SELECT slug, backdrop_url FROM dramas ORDER BY slug")
    all_dramas = cursor.fetchall()
    with_backdrop = sum(1 for _, url in all_dramas if url)
    print(f"  With backdrop: {with_backdrop}/{len(all_dramas)}")
    print(f"  Missing:       {len(all_dramas) - with_backdrop}")

    print(f"\nAll dramas:")
    for slug, url in all_dramas:
        status = "✓" if url else "✗"
        short_url = (url[:70] + '...') if url and len(url) > 70 else (url or 'NULL')
        print(f"  {status} {slug}: {short_url}")

    conn.close()
    print(f"\nDone! Run update_backdrop_data.py with network access to fill remaining {len(all_dramas) - with_backdrop} backdrops.")


if __name__ == '__main__':
    main()
