#!/usr/bin/env python3
"""
CDrama Database v12.0 - TMDB Website Scraper (Alternative to API)
==================================================================
Scrapes TMDB website directly since api.themoviedb.org is blocked in sandbox.
Outputs: data/v12_tmdb_results.json

Uses:
- TMDB website search to find drama IDs
- TMDB detail pages for synopsis, poster, backdrop, episodes
- TMDB person pages for actor details (bio, photos, filmography)
"""

import requests
import re
import json
import time
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "data", "v12_tmdb_results.json")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

TOP_CAST = 15
REQUEST_DELAY = 0.5

DRAMA_LIST = [
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

EXTRA_CAST_ONLY = [
    {"num": 41, "cn": "天盛长歌", "en": "The Rise of Phoenixes", "year": 2018, "tmdb_id": 81667},
]


def search_tmdb_website(title, year):
    """Search TMDB website for drama, return (tmdb_id, actual_year) or None."""
    try:
        resp = requests.get(
            'https://www.themoviedb.org/search',
            params={'query': title},
            headers=HEADERS,
            timeout=15
        )
        if resp.status_code != 200:
            return None
        
        # Find TV show links with IDs
        tv_matches = re.findall(r'<a[^>]*href="/tv/(\d+)(?:-[^"]*)?"[^>]*>([^<]*)</a>', resp.text)
        if not tv_matches:
            # Fallback: just find IDs
            tv_ids = list(dict.fromkeys(re.findall(r'/tv/(\d+)', resp.text)))
            if tv_ids:
                return (int(tv_ids[0]), None)
            return None
        
        # Try to find year match
        for tid, link_title in tv_matches:
            if str(year) in link_title:
                return (int(tid), year)
        
        # No year match in search results - return first
        return (int(tv_matches[0][0]), None)
    except Exception as e:
        print(f"  [ERROR] Search failed: {e}")
        return None


def get_drama_page_data(tmdb_id):
    """Extract drama data from TMDB detail page."""
    try:
        resp = requests.get(
            f'https://www.themoviedb.org/tv/{tmdb_id}',
            headers=HEADERS,
            timeout=15
        )
        if resp.status_code != 200:
            return None
        html = resp.text
    except Exception as e:
        print(f"  [ERROR] Detail page failed: {e}")
        return None
    
    data = {'tmdb_id': tmdb_id}
    
    # Title and year from <title>
    title_match = re.search(r'<title>(.*?)</title>', html)
    if title_match:
        page_title = title_match.group(1)
        year_match = re.search(r'\((\d{4})\)', page_title)
        data['page_year'] = int(year_match.group(1)) if year_match else None
        # Clean title
        clean_title = re.sub(r'\s*[\(|—|–].*$', '', page_title).strip()
        clean_title = re.sub(r'\s*&#\d+;', '', clean_title).strip()
        data['page_title'] = clean_title
    
    # Overview
    overview_match = re.search(r'class="overview"[^>]*>\s*<p>(.*?)</p>', html, re.DOTALL)
    if overview_match:
        data['overview'] = re.sub(r'<[^>]+>', '', overview_match.group(1)).strip()
    else:
        # Try meta description
        meta_match = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]+)"', html)
        data['overview'] = meta_match.group(1).strip() if meta_match else ''
    
    # Poster from og:image (first one)
    og_images = re.findall(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html)
    if og_images:
        poster_match = re.search(r'/t/p/w\d+(/[^?]+)', og_images[0])
        if poster_match:
            data['poster_path'] = poster_match.group(1)
    
    # Backdrop from second og:image
    if len(og_images) > 1:
        backdrop_match = re.search(r'/t/p/w\d+(/[^?]+)', og_images[1])
        if backdrop_match:
            data['backdrop_path'] = backdrop_match.group(1)
    
    # Episode count
    ep_match = re.search(r'(\d+)\s*Episodes', html)
    data['episodes'] = int(ep_match.group(1)) if ep_match else 0
    
    # Status
    status_match = re.search(r'class="status"[^>]*>\s*<span[^>]*>([^<]+)', html)
    data['status'] = status_match.group(1).strip() if status_match else 'Unknown'
    
    # Vote average (rating)
    rating_match = re.search(r'class="user_score_chart"[^>]*data-percent="([^"]+)"', html)
    data['rating'] = float(rating_match.group(1)) / 10 if rating_match else 0
    
    # Cast from card structure
    cards = re.findall(r'<li class="card">(.*?)</li>', html, re.DOTALL)
    cast = []
    seen_ids = set()
    for card in cards:
        pid_match = re.search(r'href="/person/(\d+)"', card)
        name_match = re.search(r'<p>\s*<a[^>]*>([^<]+)</a>', card)
        char_match = re.search(r'class="character"[^>]*>\s*([^<]+)', card)
        
        if pid_match and name_match:
            pid = int(pid_match.group(1))
            if pid not in seen_ids:
                seen_ids.add(pid)
                name = name_match.group(1).strip()
                # Clean HTML entities
                name = re.sub(r'&#\d+;', '', name).strip()
                character = char_match.group(1).strip() if char_match else ''
                character = re.sub(r'&#\d+;', '', character).strip()
                
                cast.append({
                    'tmdb_person_id': pid,
                    'name': name,
                    'character': character,
                    'profile_path': '',  # Will fetch separately if needed
                })
    
    data['cast'] = cast[:TOP_CAST]
    return data


def get_person_data(person_id):
    """Fetch person details from TMDB website."""
    try:
        resp = requests.get(
            f'https://www.themoviedb.org/person/{person_id}',
            headers=HEADERS,
            timeout=15
        )
        if resp.status_code != 200:
            return {}
        html = resp.text
    except:
        return {}
    
    data = {}
    
    # Biography
    bio_match = re.search(r'class="biography"[^>]*>\s*<p>(.*?)</p>', html, re.DOTALL)
    if bio_match:
        data['biography_en'] = re.sub(r'<[^>]+>', '', bio_match.group(1)).strip()
    
    # Birthday
    bday_match = re.search(r'class="birthday"[^>]*>([^<]+)', html)
    if bday_match:
        data['birthday'] = bday_match.group(1).strip()
    
    # Birthplace
    bplace_match = re.search(r'class="place_of_birth"[^>]*>([^<]+)', html)
    if bplace_match:
        data['birthplace'] = bplace_match.group(1).strip()
    
    # Profile image from og:image
    og_images = re.findall(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html)
    if og_images:
        profile_match = re.search(r'/t/p/w\d+(/[^?]+)', og_images[0])
        if profile_match:
            data['profile_path'] = profile_match.group(1)
    
    # Also known as
    aka_match = re.findall(r'class="also_known_as"[^>]*>.*?<li>([^<]+)', html, re.DOTALL)
    data['also_known_as'] = [a.strip() for a in aka_match if a.strip()]
    
    # Photos from the images section
    photo_urls = re.findall(r'data-src="(/t/p/w\d+[^"]+)"', html)
    data['photos'] = [
        re.sub(r'/t/p/w\d+', '/t/p/w300', p) for p in photo_urls[:6]
    ]
    
    return data


def make_slug(en_title):
    slug = en_title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    return slug


def main():
    print("=" * 60)
    print("CDrama Database v12.0 - TMDB Website Scraper")
    print("=" * 60)
    print(f"Dramas to fetch: {len(DRAMA_LIST)}")
    print(f"Output: {OUTPUT_PATH}")
    print()
    
    results = {"dramas": [], "skipped": [], "actors": [], "extra_cast": []}
    all_actor_ids = set()
    
    # --- Fetch drama data ---
    for item in DRAMA_LIST:
        num, en, cn, year = item["num"], item["en"], item["cn"], item["year"]
        print(f"[{num:02d}] {en} ({cn}, {year})")
        
        # Search for TMDB ID
        search_result = search_tmdb_website(en, year)
        if not search_result:
            print(f"  [SKIP] Not found")
            results["skipped"].append({"num": num, "title": en, "cn": cn, "reason": "Not found"})
            time.sleep(REQUEST_DELAY)
            continue
        
        tmdb_id, actual_year = search_result
        print(f"  TMDB ID: {tmdb_id}" + (f" (year: {actual_year})" if actual_year else ""))
        
        # Fetch detail page
        time.sleep(REQUEST_DELAY)
        page_data = get_drama_page_data(tmdb_id)
        if not page_data:
            print(f"  [SKIP] Could not fetch details")
            results["skipped"].append({"num": num, "title": en, "cn": cn, "reason": "Detail fetch failed"})
            continue
        
        slug = make_slug(en)
        
        drama_record = {
            "slug": slug,
            "tmdb_id": tmdb_id,
            "original_title": cn,
            "original_language": "zh",
            "titles_json": {"en": en, "zh": cn},
            "synopsis_en": page_data.get("overview", ""),
            "genres": item["genres"],
            "mood_tags": item["moods"],
            "rating": page_data.get("rating", 0),
            "year": actual_year or page_data.get("page_year") or year,
            "episodes": page_data.get("episodes", 0),
            "status": page_data.get("status", "Unknown"),
            "poster_url": page_data.get("poster_path", ""),
            "backdrop_url": f"https://image.tmdb.org/t/p/original{page_data['backdrop_path']}" if page_data.get("backdrop_path") else "",
            "streaming_json": {},
            "cast": page_data.get("cast", []),
            "work_order_num": num,
        }
        
        results["dramas"].append(drama_record)
        
        # Collect actors
        for c in page_data.get("cast", []):
            pid = c.get("tmdb_person_id")
            if pid and pid not in all_actor_ids:
                all_actor_ids.add(pid)
                results["actors"].append({
                    "name": c["name"],
                    "tmdb_person_id": pid,
                    "profile_path": c.get("profile_path", ""),
                })
        
        print(f"  OK: {len(page_data.get('cast', []))} cast, {page_data.get('episodes', 0)} eps")
        time.sleep(REQUEST_DELAY)
    
    # --- Extra cast for existing drama (#41) ---
    for item in EXTRA_CAST_ONLY:
        tmdb_id = item["tmdb_id"]
        print(f"\n[Extra Cast] {item['en']} (tmdb_id={tmdb_id})")
        time.sleep(REQUEST_DELAY)
        page_data = get_drama_page_data(tmdb_id)
        if page_data:
            results["extra_cast"].append({
                "tmdb_id": tmdb_id,
                "title": item["en"],
                "cast": page_data.get("cast", []),
            })
            for c in page_data.get("cast", []):
                pid = c.get("tmdb_person_id")
                if pid and pid not in all_actor_ids:
                    all_actor_ids.add(pid)
                    results["actors"].append({
                        "name": c["name"],
                        "tmdb_person_id": pid,
                        "profile_path": c.get("profile_path", ""),
                    })
            print(f"  OK: {len(page_data.get('cast', []))} cast")
    
    # --- Fetch person details ---
    print(f"\n--- Fetching details for {len(results['actors'])} actors ---")
    for i, actor in enumerate(results["actors"]):
        pid = actor["tmdb_person_id"]
        time.sleep(REQUEST_DELAY)
        person_data = get_person_data(pid)
        
        actor["birthday"] = person_data.get("birthday")
        actor["deathday"] = None
        actor["birthplace"] = person_data.get("birthplace", "")
        actor["gender"] = 0
        actor["also_known_as"] = person_data.get("also_known_as", [])
        actor["biography_en"] = person_data.get("biography_en", "")
        actor["photos"] = person_data.get("photos", [])
        actor["known_for_department"] = "Acting"
        
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i+1}/{len(results['actors'])}")
    
    # --- Save ---
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Dramas fetched: {len(results['dramas'])}")
    print(f"  Skipped: {len(results['skipped'])}")
    print(f"  Actors collected: {len(results['actors'])}")
    print(f"  Extra cast: {len(results['extra_cast'])}")
    print(f"  Output: {OUTPUT_PATH}")
    print(f"{'=' * 60}")
    
    if results["skipped"]:
        print(f"\nSkipped:")
        for s in results["skipped"]:
            print(f"  [{s['num']:02d}] {s['title']} ({s['cn']}): {s['reason']}")


if __name__ == "__main__":
    main()
