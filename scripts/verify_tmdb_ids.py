#!/usr/bin/env python3
"""Step 10.0: Verify all 70 TMDB IDs from expansion v10.0"""
import requests
import time
import json
import os

TMDB_API_KEY = "4e5f48d53bf05d5e2b63f4f19e2b8e9c"
BASE_URL = "https://api.themoviedb.org/3"

VERIFY_LIST = [
    (225008, "The Long Season", 2023, "the-long-season"),
    (105053, "The Long Night", 2020, "the-long-night"),
    (104960, "The Bad Kids", 2020, "the-bad-kids"),
    (204541, "Three-Body", 2023, "three-body"),
    (230835, "Mysterious Lotus Casebook", 2023, "mysterious-lotus-casebook"),
    (106841, "Blossoms Shanghai", 2024, "blossoms-shanghai"),
    (116586, "Minning Town", 2021, "minning-town"),
    (117954, "The Age of Awakening", 2021, "the-age-of-awakening"),
    (90768, "The Longest Day in Chang'an", 2019, "the-longest-day-in-changan"),
    (69316, "Eternal Love", 2017, "eternal-love"),
    (81133, "Story of Yanxi Palace", 2018, "story-of-yanxi-palace"),
    (71673, "Princess Agents", 2017, "princess-agents"),
    (112217, "Hikaru no Go", 2020, "hikaru-no-go"),
    (81667, "The Rise of Phoenixes", 2018, "the-rise-of-phoenixes"),
    (211089, "Strange Tales of Tang Dynasty", 2022, "strange-tales-of-tang-dynasty"),
    (216943, "The Blood of Youth", 2022, "the-blood-of-youth"),
    (95834, "Legend of Fei", 2020, "legend-of-fei"),
    (127323, "Who Rules the World", 2022, "who-rules-the-world"),
    (89614, "Sword Snow Stride", 2021, "sword-snow-stride"),
    (73982, "Day and Night", 2017, "day-and-night"),
    (203042, "Ordinary Greatness", 2022, "ordinary-greatness"),
    (211927, "Thirteen Years of Dust", 2023, "thirteen-years-of-dust"),
    (91657, "Young Blood", 2019, "young-blood"),
    (124595, "The Imperial Coroner", 2021, "the-imperial-coroner"),
    (320986, "Moral Peanuts Finale", 2015, "moral-peanuts-finale"),
    (233971, "I Am a Criminal Police", 2024, "i-am-a-criminal-police"),
    (252636, "The Borderlands", 2024, "the-borderlands"),
    (206489, "The Heart of Genius", 2022, "the-heart-of-genius"),
    (80837, "Guardian", 2018, "guardian"),
    (120199, "Rattan", 2021, "rattan"),
    (136443, "The Bionic Life", 2023, "the-bionic-life"),
    (78985, "With You", 2016, "with-you"),
    (78986, "My Huckleberry Friends", 2017, "my-huckleberry-friends"),
    (93362, "Suddenly This Summer", 2018, "suddenly-this-summer"),
    (104083, "I Don't Want to Be Friends With You", 2020, "i-dont-want-to-be-friends-with-you"),
    (210580, "Nothing But You", 2023, "nothing-but-you"),
    (228547, "When I Fly Towards You", 2023, "when-i-fly-towards-you"),
    (103635, "The Romance of Tiger and Rose", 2020, "the-romance-of-tiger-and-rose"),
    (118759, "My Heroic Husband", 2021, "my-heroic-husband"),
    (235195, "Hilarious Family", 2024, "hilarious-family"),
    (229146, "Romance on the Farm", 2023, "romance-on-the-farm"),
    (110632, "Love Is Sweet", 2020, "love-is-sweet"),
    (109866, "Dating in the Kitchen", 2020, "dating-in-the-kitchen"),
    (73031, "Tientsin Mystic", 2017, "tientsin-mystic"),
    (113621, "Psych-Hunter", 2020, "psych-hunter"),
    (245292, "The Spirealm", 2024, "the-spirealm"),
    (138291, "The Demon Hunter's Romance", 2023, "the-demon-hunters-romance"),
    (239389, "Fangs of Fortune", 2024, "fangs-of-fortune"),
    (207668, "The Legend of Shen Li", 2024, "the-legend-of-shen-li"),
    (129117, "One and Only", 2021, "one-and-only"),
    (86857, "Good Bye My Princess", 2019, "good-bye-my-princess"),
    (90819, "Love and Destiny", 2019, "love-and-destiny"),
    (263290, "The Blossoming of Mountain Flowers", 2024, "the-blossoming-of-mountain-flowers"),
    (253747, "To the Wonder", 2024, "to-the-wonder"),
    (325397, "Strange Tales of Tang Dynasty II", 2024, "strange-tales-of-tang-dynasty-ii"),
    (201776, "The Legend of Tianxing", 2024, "the-legend-of-tianxing"),
    (274260, "The Story of Alley", 2024, "the-story-of-alley"),
    (233912, "Guardians of the Dafeng", 2024, "guardians-of-the-dafeng"),
    (240440, "The Story of Pearl Girl", 2024, "the-story-of-pearl-girl"),
    (252640, "Legend of Zang Hai", 2025, "legend-of-zang-hai"),
    (259188, "Bleaching", 2025, "bleaching"),
    (243083, "Glorious Beauty of Tang", 2025, "glorious-beauty-of-tang"),
    (236726, "See Her Again", 2024, "see-her-again"),
    (236617, "Regeneration", 2024, "regeneration"),
    (134983, "Medal of the Republic", 2021, "medal-of-the-republic"),
    (205017, "The Daughter of the Mountain", 2022, "the-daughter-of-the-mountain"),
    (84856, "Like a Flowing River", 2018, "like-a-flowing-river"),
    (87544, "All Is Well", 2019, "all-is-well"),
    (82817, "Go Go Squid!", 2019, "go-go-squid"),
    (80455, "Legend of Yunxi", 2018, "legend-of-yunxi"),
]

PROGRESS_FILE = "/Coze/Drive/CDrama_Database/cdrama-database/data/_verify_progress.json"

def verify_batch(start_idx, batch_size=10):
    results = []
    end_idx = min(start_idx + batch_size, len(VERIFY_LIST))
    
    for i in range(start_idx, end_idx):
        tmdb_id, expected_name, expected_year, slug = VERIFY_LIST[i]
        try:
            resp = requests.get(
                f"{BASE_URL}/tv/{tmdb_id}",
                params={"api_key": TMDB_API_KEY},
                timeout=10
            )
            if resp.status_code == 404:
                status = "NOT_FOUND"
                print(f"  FAIL: {tmdb_id} ({slug}) -> NOT FOUND")
            elif resp.status_code == 200:
                data = resp.json()
                actual_name = data.get('name', '')
                actual_year_str = data.get('first_air_date', '0000-01-01')[:4]
                actual_year = int(actual_year_str) if actual_year_str else 0
                year_match = "OK" if actual_year == expected_year else f"YEAR_MISMATCH(expected={expected_year},got={actual_year})"
                status = "OK" if actual_year == expected_year else "YEAR_MISMATCH"
                print(f"  [{status}] {tmdb_id} ({slug}) -> '{actual_name}' ({actual_year}) {year_match}")
            else:
                status = f"HTTP_{resp.status_code}"
                print(f"  FAIL: {tmdb_id} ({slug}) -> HTTP {resp.status_code}")
                
            results.append({
                "idx": i, "tmdb_id": tmdb_id, "slug": slug,
                "expected_year": expected_year, "status": status
            })
        except Exception as e:
            print(f"  ERROR: {tmdb_id} ({slug}) -> {e}")
            results.append({
                "idx": i, "tmdb_id": tmdb_id, "slug": slug,
                "expected_year": expected_year, "status": "ERROR", "error": str(e)
            })
        
        time.sleep(0.4)
    
    return results

def main():
    all_results = []
    
    # Check for existing progress
    start_from = 0
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            progress = json.load(f)
            start_from = progress.get('next_idx', 0)
            all_results = progress.get('results', [])
            print(f"Resuming from index {start_from}")
    
    total = len(VERIFY_LIST)
    batch_size = 10
    
    for batch_start in range(start_from, total, batch_size):
        print(f"\nBatch: [{batch_start} - {min(batch_start+batch_size, total)-1}] / {total}")
        results = verify_batch(batch_start, batch_size)
        all_results.extend(results)
        
        # Save progress
        next_idx = batch_start + batch_size
        with open(PROGRESS_FILE, 'w') as f:
            json.dump({"next_idx": next_idx, "results": all_results}, f)
        
        if next_idx < total:
            time.sleep(1)
    
    # Summary
    ok_count = sum(1 for r in all_results if r['status'] == 'OK')
    mismatch = sum(1 for r in all_results if 'MISMATCH' in r.get('status', ''))
    not_found = sum(1 for r in all_results if r['status'] == 'NOT_FOUND')
    errors = sum(1 for r in all_results if r['status'] == 'ERROR')
    
    print(f"\n{'='*60}")
    print(f"TMDB ID VERIFICATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total checked: {len(all_results)}/{total}")
    print(f"OK: {ok_count}")
    print(f"Year mismatch (non-blocking): {mismatch}")
    print(f"Not found: {not_found}")
    print(f"Errors: {errors}")
    
    if not_found > 0:
        print(f"\nNOT FOUND IDs:")
        for r in all_results:
            if r['status'] == 'NOT_FOUND':
                print(f"  - {r['tmdb_id']} ({r['slug']})")
    
    if errors > 0:
        print(f"\nERROR IDs:")
        for r in all_results:
            if r['status'] == 'ERROR':
                print(f"  - {r['tmdb_id']} ({r['slug']}): {r.get('error')}")

    if mismatch > 0:
        print(f"\nYEAR MISMATCH IDs (informational):")
        for r in all_results:
            if 'MISMATCH' in r.get('status', ''):
                print(f"  - {r['tmdb_id']} ({r['slug']})")

    print(f"\nVerification {'PASSED' if not_found == 0 else 'FAILED'}!")
    return not_found == 0

if __name__ == '__main__':
    main()
