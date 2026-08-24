#!/usr/bin/env python3
"""
CDrama Database v12.0 - TMDB Fetch Only (No DB Operations)
==========================================================
Run this script locally to fetch drama data from TMDB API.
Output: data/v12_tmdb_results.json

Usage:
  pip install requests
  python scripts/v12_tmdb_fetch_only.py

After completion, commit and push data/v12_tmdb_results.json to the repo.
"""

import json
import re
import time
import os
import sys

try:
    import requests
except ImportError:
    print("ERROR: 'requests' library not found. Run: pip install requests")
    sys.exit(1)

# Configuration
API_KEY = "4e5f48d53bf05d5e2b63f4f19e2b8e9c"
BASE_URL = "https://api.themoviedb.org/3"
TIMEOUT = 15
TOP_CAST_COUNT = 15

# Drama list from work order v12.0.2
DRAMA_LIST = [
    # Tier 1: Classic Must-Watch (15)
    {"num": 1,  "cn": "甄嬛传", "en": "Empresses in the Palace", "year": 2012, "genres": ["historical", "drama"], "moods": ["intense", "aesthetic"]},
    {"num": 2,  "cn": "花千骨", "en": "The Journey of Flower", "year": 2015, "genres": ["fantasy", "romance"], "moods": ["romantic", "wanna_cry"]},
    {"num": 3,  "cn": "择天记", "en": "Fighter of the Destiny", "year": 2017, "genres": ["fantasy", "romance"], "moods": ["aesthetic", "romantic"]},
    {"num": 4,  "cn": "锦绣未央", "en": "The Princess Weiyoung", "year": 2016, "genres": ["historical", "drama"], "moods": ["intense", "empowering"]},
    {"num": 5,  "cn": "青云志", "en": "Noble Aspirations", "year": 2016, "genres": ["fantasy", "wuxia"], "moods": ["aesthetic", "romantic"]},
    {"num": 6,  "cn": "锦衣之下", "en": "Under the Power", "year": 2019, "genres": ["historical", "romance", "mystery"], "moods": ["romantic", "intense"]},
    {"num": 7,  "cn": "长歌行", "en": "The Long Ballad", "year": 2021, "genres": ["historical", "action", "drama"], "moods": ["empowering", "aesthetic"]},
    {"num": 8,  "cn": "千古玦尘", "en": "Ancient Love Poetry", "year": 2021, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 9,  "cn": "一念关山", "en": "A Journey to Love", "year": 2023, "genres": ["wuxia", "romance"], "moods": ["romantic", "intense"]},
    {"num": 10, "cn": "三生三世枕上书", "en": "Eternal Love of Dream", "year": 2020, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 11, "cn": "狼殿下", "en": "The Wolf", "year": 2020, "genres": ["historical", "romance"], "moods": ["romantic", "wanna_cry"]},
    {"num": 12, "cn": "风吹半夏", "en": "Wild Bloom", "year": 2022, "genres": ["drama", "romance"], "moods": ["empowering", "wanna_cry"]},
    {"num": 13, "cn": "玉骨遥", "en": "The Longest Promise", "year": 2023, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 14, "cn": "安乐传", "en": "The Legend of Anle", "year": 2023, "genres": ["historical", "romance", "action"], "moods": ["romantic", "empowering"]},
    {"num": 15, "cn": "长风渡", "en": "The Long Wind", "year": 2023, "genres": ["historical", "romance"], "moods": ["romantic", "light_fun"]},
    # Tier 2: Type Reinforcement (15)
    {"num": 16, "cn": "招摇", "en": "The Legends", "year": 2019, "genres": ["fantasy", "romance", "action"], "moods": ["light_fun", "romantic"]},
    {"num": 17, "cn": "青丘狐传说", "en": "Legend of Nine Tails Fox", "year": 2016, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 18, "cn": "流星花园", "en": "Meteor Garden", "year": 2018, "genres": ["youth", "romance", "comedy"], "moods": ["light_fun", "romantic"]},
    {"num": 19, "cn": "原来你还在这里", "en": "Never Gone", "year": 2016, "genres": ["youth", "romance"], "moods": ["romantic", "wanna_cry"]},
    {"num": 20, "cn": "全职高手", "en": "The King's Avatar", "year": 2019, "genres": ["youth", "action", "sci_fi"], "moods": ["empowering", "light_fun"]},
    {"num": 21, "cn": "皓衣行", "en": "Immortality", "year": 2024, "genres": ["fantasy", "wuxia"], "moods": ["aesthetic", "intense"]},
    {"num": 22, "cn": "星落凝成糖", "en": "The Starry Love", "year": 2023, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 23, "cn": "他是谁", "en": "Who Is He", "year": 2024, "genres": ["crime", "thriller"], "moods": ["intense", "mindbending"]},
    {"num": 24, "cn": "重启之极海听雷", "en": "Reunion", "year": 2020, "genres": ["adventure", "mystery", "action"], "moods": ["intense", "mindbending"]},
    {"num": 25, "cn": "谁是凶手", "en": "Who Is the Murderer", "year": 2021, "genres": ["thriller", "mystery", "crime"], "moods": ["intense", "mindbending"]},
    {"num": 26, "cn": "老九门", "en": "The Mystic Nine", "year": 2016, "genres": ["adventure", "mystery", "action"], "moods": ["intense", "mindbending"]},
    {"num": 27, "cn": "大唐荣耀", "en": "Glory in the Daytime", "year": 2017, "genres": ["historical", "romance", "drama"], "moods": ["romantic", "intense"]},
    {"num": 28, "cn": "暮白首", "en": "Love a Lifetime", "year": 2020, "genres": ["wuxia", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 29, "cn": "夏至未至", "en": "Rush to the Dead Summer", "year": 2017, "genres": ["youth", "romance", "drama"], "moods": ["romantic", "wanna_cry"]},
    {"num": 30, "cn": "悲伤逆流成河", "en": "Cry Me a Sad River", "year": 2019, "genres": ["youth", "drama"], "moods": ["wanna_cry", "intense"]},
    # Tier 3: Hot New Dramas & Actor Crossover (17, excluding #35, #41, #48)
    {"num": 31, "cn": "狐妖小红娘月红篇", "en": "Fox Spirit Matchmaker", "year": 2024, "genres": ["fantasy", "romance"], "moods": ["romantic", "light_fun"]},
    {"num": 32, "cn": "与君歌", "en": "Stand By Me", "year": 2021, "genres": ["historical", "romance"], "moods": ["romantic", "intense"]},
    {"num": 33, "cn": "梦华录", "en": "A Dream of Splendor", "year": 2022, "genres": ["historical", "romance"], "moods": ["romantic", "empowering"]},
    {"num": 34, "cn": "镜双城", "en": "Mirror Twin Cities", "year": 2022, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 36, "cn": "人间至味是清欢", "en": "Love Actually", "year": 2017, "genres": ["romance", "drama"], "moods": ["romantic", "light_fun"]},
    {"num": 37, "cn": "谈判官", "en": "The Negotiator", "year": 2018, "genres": ["romance", "drama"], "moods": ["romantic", "intense"]},
    {"num": 38, "cn": "扶摇", "en": "Legend of Fuyao", "year": 2018, "genres": ["fantasy", "romance"], "moods": ["romantic", "empowering"]},
    {"num": 39, "cn": "孤芳不自赏", "en": "General and I", "year": 2017, "genres": ["historical", "romance"], "moods": ["romantic", "intense"]},
    {"num": 40, "cn": "醉玲珑", "en": "Lost Love in Times", "year": 2017, "genres": ["fantasy", "historical"], "moods": ["romantic", "aesthetic"]},
    {"num": 42, "cn": "凤囚凰", "en": "Untamed Beauty", "year": 2018, "genres": ["historical", "romance"], "moods": ["romantic", "intense"]},
    {"num": 43, "cn": "九州天空城", "en": "Novoland The Castle in the Sky", "year": 2016, "genres": ["fantasy", "romance"], "moods": ["romantic", "aesthetic"]},
    {"num": 44, "cn": "海上牧云记", "en": "Tribes and Empires", "year": 2017, "genres": ["fantasy", "historical"], "moods": ["intense", "aesthetic"]},
    {"num": 45, "cn": "将夜", "en": "Ever Night", "year": 2018, "genres": ["fantasy", "wuxia"], "moods": ["aesthetic", "intense"]},
    {"num": 46, "cn": "夜天子", "en": "Night Emperor", "year": 2018, "genres": ["historical", "comedy"], "moods": ["light_fun", "intense"]},
    {"num": 47, "cn": "回到明朝当王爷", "en": "Royal Nirvana", "year": 2018, "genres": ["historical", "comedy"], "moods": ["light_fun", "mindbending"]},
    {"num": 49, "cn": "九州缥缈录", "en": "Novoland Eagle Flag", "year": 2019, "genres": ["fantasy", "historical"], "moods": ["intense", "aesthetic"]},
    {"num": 50, "cn": "大明风华", "en": "Ming Dynasty", "year": 2019, "genres": ["historical", "drama"], "moods": ["intense", "aesthetic"]},
]

# Also need to add cast for #41 The Rise of Phoenixes (already in DB, tmdb_id=81667)
EXTRA_CAST_ONLY = [
    {"num": 41, "cn": "天盛长歌", "en": "The Rise of Phoenixes", "year": 2018, "tmdb_id": 81667},
]

# Known existing TMDB IDs to skip (already in DB)
EXISTING_TMDB_IDS = {
    90761, 119362, 108234,  # just a few known ones - the script will also check
    # These will be checked against the JSON output, not a live DB
}


def tmdb_request(endpoint, params=None):
    """Make a TMDB API request."""
    url = f"{BASE_URL}/{endpoint}"
    if params is None:
        params = {}
    params["api_key"] = API_KEY
    
    try:
        resp = requests.get(url, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  [FAIL] {endpoint}: {e}")
        return None


def search_tmdb(en_title, year):
    """Search TMDB for a drama."""
    data = tmdb_request("search/tv", {"query": en_title, "language": "en-US"})
    if not data or "results" not in data or not data["results"]:
        return None
    
    # Exact year match
    for r in data["results"]:
        if r.get("first_air_date") and r["first_air_date"][:4] == str(year):
            return r
    
    # Closest year (within 2 years)
    best, best_diff = None, 999
    for r in data["results"]:
        if r.get("first_air_date"):
            try:
                diff = abs(int(r["first_air_date"][:4]) - year)
                if diff <= 2 and diff < best_diff:
                    best_diff, best = diff, r
            except:
                pass
    
    if best:
        print(f"  [WARN] Year mismatch: expected {year}, found {best.get('first_air_date','')[:4]}")
    return best


def make_slug(en_title):
    """Create URL-friendly slug."""
    slug = en_title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    return slug


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_path = os.path.join(project_dir, "data", "v12_tmdb_results.json")
    
    print("=" * 60)
    print("CDrama Database v12.0 - TMDB Fetch (Output to JSON)")
    print("=" * 60)
    print(f"Dramas to fetch: {len(DRAMA_LIST)}")
    print(f"Extra cast-only: {len(EXTRA_CAST_ONLY)}")
    print(f"Output: {output_path}")
    print()
    
    results = {"dramas": [], "skipped": [], "actors": [], "extra_cast": []}
    
    # --- Fetch drama data ---
    for item in DRAMA_LIST:
        num, en, cn, year = item["num"], item["en"], item["cn"], item["year"]
        print(f"[{num:02d}] {en} ({cn}, {year})")
        
        # Search TMDB
        search_result = search_tmdb(en, year)
        if not search_result:
            print(f"  [SKIP] Not found on TMDB")
            results["skipped"].append({"num": num, "title": en, "cn": cn, "reason": "Not found"})
            continue
        
        tmdb_id = search_result["id"]
        actual_year = search_result.get("first_air_date", "")[:4]
        print(f"  TMDB ID: {tmdb_id}, year: {actual_year}")
        
        # Check if already in our known existing set
        if tmdb_id in EXISTING_TMDB_IDS:
            print(f"  [SKIP] Already in database")
            results["skipped"].append({"num": num, "title": en, "cn": cn, "reason": f"Already in DB (tmdb_id={tmdb_id})"})
            continue
        
        # Get details
        time.sleep(0.3)
        details = tmdb_request(f"tv/{tmdb_id}", {"language": "en-US"})
        if not details:
            results["skipped"].append({"num": num, "title": en, "cn": cn, "reason": "Details fetch failed"})
            continue
        
        # Get cast
        time.sleep(0.3)
        credits_data = tmdb_request(f"tv/{tmdb_id}/credits")
        cast_list = []
        if credits_data and "cast" in credits_data:
            cast_list = credits_data["cast"][:TOP_CAST_COUNT]
        
        # Get streaming providers
        time.sleep(0.3)
        providers_data = tmdb_request(f"tv/{tmdb_id}/watch/providers")
        streaming = {}
        if providers_data and "results" in providers_data:
            seen = set()
            providers = {}
            for region, rdata in providers_data["results"].items():
                if "flatrate" in rdata:
                    for p in rdata["flatrate"]:
                        if p["provider_name"] not in seen:
                            seen.add(p["provider_name"])
                            providers[p["provider_name"]] = {
                                "logo_path": p.get("logo_path", ""),
                                "provider_id": p["provider_id"]
                            }
            streaming = {"providers": providers}
        
        # Build drama record
        slug = make_slug(en)
        poster_path = details.get("poster_path", "")
        backdrop_path = details.get("backdrop_path", "")
        
        drama_record = {
            "slug": slug,
            "tmdb_id": tmdb_id,
            "original_title": cn,
            "original_language": details.get("original_language", "zh"),
            "titles_json": {"en": en, "zh": cn},
            "synopsis_en": details.get("overview", ""),
            "genres": item["genres"],
            "mood_tags": item["moods"],
            "rating": details.get("vote_average", 0),
            "year": int(actual_year) if actual_year else year,
            "episodes": details.get("number_of_episodes", 0),
            "status": details.get("status", "Unknown"),
            "poster_url": poster_path,
            "backdrop_url": f"https://image.tmdb.org/t/p/original{backdrop_path}" if backdrop_path else "",
            "streaming_json": streaming,
            "cast": [
                {
                    "name": c.get("name", ""),
                    "character": c.get("character", ""),
                    "profile_path": c.get("profile_path", ""),
                    "tmdb_person_id": c.get("id", 0),
                    "known_for_department": c.get("known_for_department", "Acting"),
                }
                for c in cast_list
            ],
            "work_order_num": num,
        }
        
        results["dramas"].append(drama_record)
        
        # Collect unique actors
        for c in cast_list:
            if c.get("name") and c.get("id"):
                actor_entry = {
                    "name": c["name"],
                    "tmdb_person_id": c["id"],
                    "profile_path": c.get("profile_path", ""),
                    "known_for_department": c.get("known_for_department", "Acting"),
                }
                # Avoid duplicates
                if not any(a["tmdb_person_id"] == actor_entry["tmdb_person_id"] for a in results["actors"]):
                    results["actors"].append(actor_entry)
        
        print(f"  OK: {len(cast_list)} cast, {details.get('number_of_episodes', 0)} eps")
        time.sleep(0.2)
    
    # --- Fetch extra cast for existing drama (#41) ---
    for item in EXTRA_CAST_ONLY:
        tmdb_id = item["tmdb_id"]
        print(f"\n[Extra Cast] {item['en']} (tmdb_id={tmdb_id})")
        time.sleep(0.3)
        credits_data = tmdb_request(f"tv/{tmdb_id}/credits")
        if credits_data and "cast" in credits_data:
            cast_list = credits_data["cast"][:TOP_CAST_COUNT]
            results["extra_cast"].append({
                "tmdb_id": tmdb_id,
                "title": item["en"],
                "cast": [
                    {
                        "name": c.get("name", ""),
                        "character": c.get("character", ""),
                        "profile_path": c.get("profile_path", ""),
                        "tmdb_person_id": c.get("id", 0),
                    }
                    for c in cast_list
                ]
            })
            print(f"  OK: {len(cast_list)} cast members")
            
            # Also add new actors
            for c in cast_list:
                if c.get("name") and c.get("id"):
                    if not any(a["tmdb_person_id"] == c["id"] for a in results["actors"]):
                        results["actors"].append({
                            "name": c["name"],
                            "tmdb_person_id": c["id"],
                            "profile_path": c.get("profile_path", ""),
                            "known_for_department": c.get("known_for_department", "Acting"),
                        })
    
    # --- Fetch person details for new actors ---
    print(f"\n--- Fetching details for {len(results['actors'])} actors ---")
    for i, actor in enumerate(results["actors"]):
        pid = actor["tmdb_person_id"]
        if pid:
            time.sleep(0.25)
            person_data = tmdb_request(f"person/{pid}")
            if person_data:
                actor["birthday"] = person_data.get("birthday")
                actor["deathday"] = person_data.get("deathday")
                actor["birthplace"] = person_data.get("place_of_birth", "")
                actor["gender"] = person_data.get("gender", 0)
                actor["also_known_as"] = person_data.get("also_known_as", [])
                actor["biography_en"] = person_data.get("biography", "")
                
                # Get photos
                time.sleep(0.25)
                images_data = tmdb_request(f"person/{pid}/images")
                if images_data and "profiles" in images_data:
                    actor["photos"] = [
                        f"https://image.tmdb.org/t/p/w300{p['file_path']}"
                        for p in images_data["profiles"][:6]
                        if p.get("file_path")
                    ]
                
                # Get full filmography (TV credits)
                time.sleep(0.25)
                tv_credits = tmdb_request(f"person/{pid}/tv_credits")
                if tv_credits:
                    actor["tv_cast"] = [
                        {
                            "tmdb_id": r.get("id"),
                            "name": r.get("name", ""),
                            "character": r.get("character", ""),
                            "episode_count": r.get("episode_count", 0),
                            "first_air_date": r.get("first_air_date", ""),
                            "vote_average": r.get("vote_average", 0),
                            "poster_path": r.get("poster_path", ""),
                        }
                        for r in (tv_credits.get("cast", []) or [])[:30]
                    ]
                    actor["tv_crew"] = [
                        {
                            "tmdb_id": r.get("id"),
                            "name": r.get("name", ""),
                            "job": r.get("job", ""),
                            "episode_count": r.get("episode_count", 0),
                        }
                        for r in (tv_credits.get("crew", []) or [])[:10]
                    ]
        
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i+1}/{len(results['actors'])}")
    
    # --- Save results ---
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Dramas fetched: {len(results['dramas'])}")
    print(f"  Skipped: {len(results['skipped'])}")
    print(f"  Actors collected: {len(results['actors'])}")
    print(f"  Extra cast entries: {len(results['extra_cast'])}")
    print(f"  Output saved to: {output_path}")
    print(f"{'=' * 60}")
    
    if results["skipped"]:
        print(f"\nSkipped dramas:")
        for s in results["skipped"]:
            print(f"  [{s['num']:02d}] {s['title']} ({s['cn']}): {s['reason']}")


if __name__ == "__main__":
    main()
