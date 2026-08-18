#!/usr/bin/env python3
"""
Merge Group 2 verified streaming URLs into data/streaming.json.
Applies platform corrections and replaces search URLs with direct page URLs.
"""
import json
import os

STREAMING_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'streaming.json')

with open(STREAMING_FILE, 'r', encoding='utf-8') as f:
    streaming_data = json.load(f)

# Group 2 verified results with platform corrections
group2_updates = {
    # Platform correction: WeTV → Youku
    "brocade-odyssey": {
        "platforms": [
            {"name": "Youku", "url": "https://www.youku.com/show_page/id_dbaec98a534746888182.html", "regions": ["global"]}
        ]
    },
    # Platform correction: iQIYI → Tencent Video
    "the-lost-tomb-2": {
        "platforms": [
            {"name": "Tencent Video", "url": "https://v.qq.com/x/cover/mzc00200n3ofyxa.html", "regions": ["global"]}
        ]
    },
    # Platform correction: WeTV → Viki (actually on Mango TV, international on Viki)
    "our-interpreter": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/40353c-our-interpreter", "regions": ["global"]}
        ]
    },
    # Was TBD → now WeTV + Viki
    "the-happy-seven-in-changan": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/fladjtl2rm64w6z", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/40447c-the-happy-seven-in-changan", "regions": ["global"]}
        ]
    },
    # Direct WeTV URL (better than my search URL)
    "put-your-head-on-my-shoulder": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/4cpllzcg2i3hn1a-Put-Your-Head-On-My-Shoulder", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/36617c-put-your-head-on-my-shoulder", "regions": ["global"]}
        ]
    },
    # Direct Viki + Mango TV URLs
    "go-ahead": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/36770c-go-ahead", "regions": ["global"]},
            {"name": "Mango TV", "url": "https://www.mgtv.com/h/333900/9762162.html", "regions": ["global"]}
        ]
    },
    # Direct WeTV URL
    "a-love-so-beautiful": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/1twrzqdqktvdgu8", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/35687c-a-love-so-beautiful", "regions": ["global"]}
        ]
    },
    # Direct iQIYI URL (replaces search URL)
    "bright-eyes-in-the-dark": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/album/他从火光中走来-2023-2fu3gdo9thg", "regions": ["global"]}
        ]
    },
    # Direct Youku show page URL
    "in-blossom": {
        "platforms": [
            {"name": "Youku", "url": "https://v.youku.com/v_nextstage/id_ffaac0420f0042b9b1e1.html", "regions": ["global"]}
        ]
    },
    # Direct Youku show page URL
    "blossoms-in-adversity": {
        "platforms": [
            {"name": "Youku", "url": "https://v.youku.com/v_nextstage/id_aecde7cd84c94f36b7e7.html", "regions": ["global"]}
        ]
    },
    # Direct Viki + Youku URLs
    "lighter-and-princess": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/38726c-lighter-and-princess", "regions": ["global"]},
            {"name": "Youku", "url": "https://v.youku.com/v_show/id_XNTkxMjA2Nzk2MA==.html", "regions": ["global"]}
        ]
    },
    # Direct Youku show page URL
    "day-of-change": {
        "platforms": [
            {"name": "Youku", "url": "https://v.youku.com/v_nextstage/id_zffdb0f1420364ebf8c69.html", "regions": ["global"]}
        ]
    },
    # Direct Viki URL (corrected ID)
    "hello-mr-gu": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/37853c-hello-mr-gu", "regions": ["global"]}
        ]
    },
    # Direct WeTV URL (corrected from duplicate)
    "you-are-my-glory": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/zh-cn/play/u37kgfnfzs73kiu", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/37754c-you-are-my-glory", "regions": ["global"]}
        ]
    },
    # Direct iQIYI URL
    "arsenal-military-academy": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/play/arsenal-military-academy-episode-1-19rru5u8so", "regions": ["global"]}
        ]
    },
    # Youku reservation page (drama not yet aired)
    "fated-hearts": {
        "platforms": [
            {"name": "Youku", "url": "https://v.youku.com/v_nextstage/id_fbce17caf8bc45f99dd6.html", "regions": ["global"]}
        ]
    }
}

# Apply updates
updated = 0
for slug, data in group2_updates.items():
    streaming_data[slug] = data
    updated += 1

# Write back
with open(STREAMING_FILE, 'w', encoding='utf-8') as f:
    json.dump(streaming_data, f, indent=2, ensure_ascii=False)

# Final verification: check for any remaining homepage-only URLs
homepage_urls = {
    'https://www.netflix.com', 'https://www.netflix.com/',
    'https://www.viki.com', 'https://www.viki.com/',
    'https://www.youku.com', 'https://www.youku.com/',
    'https://www.iq.com', 'https://www.iq.com/',
    'https://wetv.vip', 'https://wetv.vip/',
    'https://www.mgtv.com', 'https://www.mgtv.com/',
    ''
}

issues = []
for slug, data in streaming_data.items():
    for p in data.get('platforms', []):
        url = p.get('url', '')
        if url.rstrip('/') in {u.rstrip('/') for u in homepage_urls}:
            issues.append(f"  {slug}: {p['name']} -> {url}")

print(f"✅ Applied {updated} Group 2 updates to streaming.json")
print(f"Total dramas: {len(streaming_data)}")

if issues:
    print(f"\n⚠️ {len(issues)} entries still have homepage-only URLs:")
    for i in issues:
        print(i)
else:
    print("✅ All entries have specific URLs (no homepage-only URLs)")

# Print platform summary
platforms_count = {}
for slug, data in streaming_data.items():
    for p in data.get('platforms', []):
        name = p['name']
        platforms_count[name] = platforms_count.get(name, 0) + 1

print(f"\nPlatform distribution:")
for name, count in sorted(platforms_count.items(), key=lambda x: -x[1]):
    print(f"  {name}: {count} dramas")

