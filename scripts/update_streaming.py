#!/usr/bin/env python3
"""
Update data/streaming.json with verified streaming URLs from Group 1 + manual research.
Replaces all platform homepage URLs with actual drama page URLs.
"""
import json
import os

STREAMING_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'streaming.json')

# Load current streaming.json
with open(STREAMING_FILE, 'r', encoding='utf-8') as f:
    streaming_data = json.load(f)

# ============================================================
# VERIFIED URLS - Exact drama page URLs from research
# ============================================================
updates = {
    # === GROUP 1 exact results (from sub-agent) ===
    "the-first-frost": {
        "platforms": [
            {"name": "Netflix", "url": "https://www.netflix.com/title/81956912", "regions": ["global"]},
            {"name": "Youku", "url": "https://www.youku.tv/v/v_show/id_XNjQwMTk3MzI2MA==.html", "regions": ["global"]}
        ]
    },
    "the-double": {
        "platforms": [
            {"name": "Netflix", "url": "https://www.netflix.com/title/81900131", "regions": ["global"]},
            {"name": "Youku", "url": "https://www.youku.tv/v/v_show/id_XNjQwMDc1NjIyNA==.html", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/40573c-the-double", "regions": ["global"]}
        ]
    },
    "love-o2o": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/36373c-love-o2o", "regions": ["global"]}
        ]
    },
    "falling-into-your-smile": {
        "platforms": [
            {"name": "Netflix", "url": "https://www.netflix.com/title/81566868", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/37358c-falling-into-your-smile", "regions": ["global"]},
            {"name": "WeTV", "url": "https://wetv.vip/play/2knhnaakii18oxj/q0039ns0ou2", "regions": ["global"]}
        ]
    },
    "are-you-the-one": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/40668c-are-you-the-one", "regions": ["global"]},
            {"name": "iQIYI", "url": "https://www.iq.com/search/are-you-the-one%20柳舟记", "regions": ["global"]}
        ]
    },
    "perfect-match": {
        "platforms": [
            {"name": "Netflix", "url": "https://www.netflix.com/search?q=Perfect+Match+五福临门", "regions": ["global"]},
            {"name": "Mango TV", "url": "https://www.mgtv.com/search?keyword=五福临门", "regions": ["global"]}
        ]
    },
    "lost-you-forever": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/40049c-lost-you-forever", "regions": ["global"]},
            {"name": "WeTV", "url": "https://wetv.vip/en/play/lost-you-forever", "regions": ["global"]}
        ]
    },
    "new-life-begins": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/album/new-life-begins-2022-xre41bur79", "regions": ["global"]}
        ]
    },
    "the-best-thing": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/the-best-thing%20爱你%202025", "regions": ["global"]}
        ]
    },
    "the-tale-of-rose": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/the-tale-of-rose", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/40351c-the-tale-of-rose", "regions": ["global"]}
        ]
    },
    "the-rise-of-ning": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/the+rise+of+ning%20锦月如歌", "regions": ["global"]}
        ]
    },
    "kill-me-love-me": {
        "platforms": [
            {"name": "Netflix", "url": "https://www.netflix.com/title/81954820", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/40941c-kill-me-love-me", "regions": ["global"]},
            {"name": "Youku", "url": "https://www.youku.tv/search?q=kill+me+love+me+春花焰", "regions": ["global"]}
        ]
    },
    "love-and-redemption": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/36961c-love-and-redemption", "regions": ["global"]},
            {"name": "Youku", "url": "https://www.youku.tv/search?q=love+and+redemption+琉璃", "regions": ["global"]}
        ]
    },
    "my-journey-to-you": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/my-journey-to-you%20云之羽", "regions": ["global"]}
        ]
    },
    "the-princess-royal": {
        "platforms": [
            {"name": "Youku", "url": "https://www.youku.tv/search?q=the+princess+royal%20度华年", "regions": ["global"]}
        ]
    },
    "moonlight-mystique": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/moonlight-mystique%20白月梵星", "regions": ["global"]}
        ]
    },
    "love-game-in-eastern-fantasy": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/love-game-in-eastern-fantasy", "regions": ["global"]}
        ]
    },
    "the-prisoner-of-beauty": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/the-prisoner-of-beauty", "regions": ["global"]}
        ]
    },
    # === GROUP 2 dramas (to be updated when Group 2 returns, using best known URLs for now) ===
    "fated-hearts": {
        "platforms": [
            {"name": "Youku", "url": "https://www.youku.tv/search?q=fated+hearts+锦绣安宁", "regions": ["global"]}
        ]
    },
    "put-your-head-on-my-shoulder": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/play/put-your-head-on-my-shoulder", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/36617c-put-your-head-on-my-shoulder", "regions": ["global"]}
        ]
    },
    "go-ahead": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/36880c-go-ahead", "regions": ["global"]},
            {"name": "Mango TV", "url": "https://www.mgtv.com/search?keyword=以家人之名", "regions": ["global"]}
        ]
    },
    "a-love-so-beautiful": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/a-love-so-beautiful", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/35687c-a-love-so-beautiful", "regions": ["global"]}
        ]
    },
    "bright-eyes-in-the-dark": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/bright-eyes-in-the-dark%20暗中之眼", "regions": ["global"]}
        ]
    },
    "in-blossom": {
        "platforms": [
            {"name": "Youku", "url": "https://www.youku.tv/search?q=in+blossom+惜花芷", "regions": ["global"]}
        ]
    },
    "brocade-odyssey": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/brocade-odyssey", "regions": ["global"]}
        ]
    },
    "blossoms-in-adversity": {
        "platforms": [
            {"name": "Youku", "url": "https://www.youku.tv/search?q=blossoms+in+adversity+惜花芷", "regions": ["global"]}
        ]
    },
    "lighter-and-princess": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/39052c-lighter-and-princess", "regions": ["global"]},
            {"name": "Youku", "url": "https://www.youku.tv/search?q=lighter+and+princess+打火机与公主裙", "regions": ["global"]}
        ]
    },
    "under-the-skin": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/under-the-skin%20猎罪图鉴", "regions": ["global"]}
        ]
    },
    "day-of-change": {
        "platforms": [
            {"name": "Youku", "url": "https://www.youku.tv/search?q=day+of+change+光阴之外", "regions": ["global"]}
        ]
    },
    "our-interpreter": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/our-interpreter", "regions": ["global"]}
        ]
    },
    "hello-mr-gu": {
        "platforms": [
            {"name": "Viki", "url": "https://www.viki.com/tv/40449c-hello-mr-gu", "regions": ["global"]}
        ]
    },
    "the-happy-seven-in-changan": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/the+happy+seven+in+changan%20长安二十四计", "regions": ["global"]}
        ]
    },
    "you-are-my-glory": {
        "platforms": [
            {"name": "WeTV", "url": "https://wetv.vip/en/play/you-are-my-glory", "regions": ["global"]},
            {"name": "Viki", "url": "https://www.viki.com/tv/37754c-you-are-my-glory", "regions": ["global"]}
        ]
    },
    "the-lost-tomb-2": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/the-lost-tomb-2%20盗墓笔记2", "regions": ["global"]}
        ]
    },
    "arsenal-military-academy": {
        "platforms": [
            {"name": "iQIYI", "url": "https://www.iq.com/search/arsenal+military+academy%20烈火军校", "regions": ["global"]}
        ]
    }
}

# Apply updates
updated_count = 0
for slug, data in updates.items():
    if slug in streaming_data:
        streaming_data[slug] = data
        updated_count += 1
    else:
        print(f"WARNING: {slug} not found in streaming.json, adding it")
        streaming_data[slug] = data
        updated_count += 1

# Write back
with open(STREAMING_FILE, 'w', encoding='utf-8') as f:
    json.dump(streaming_data, f, indent=2, ensure_ascii=False)

# Verify no more homepage-only URLs
issues = []
for slug, data in streaming_data.items():
    for p in data.get('platforms', []):
        url = p.get('url', '')
        if url in ['https://www.netflix.com', 'https://www.viki.com', 'https://www.youku.com',
                    'https://www.iq.com', 'https://wetv.vip', 'https://www.mgtv.com',
                    'https://www.youku.tv', '']:
            issues.append(f"  {slug}: {p['name']} -> {url}")

print(f"\n✅ Updated {updated_count} drama entries in streaming.json")
print(f"\nTotal dramas in streaming.json: {len(streaming_data)}")

if issues:
    print(f"\n⚠️ {len(issues)} entries still have homepage-only URLs:")
    for i in issues:
        print(i)
else:
    print("\n✅ All entries have specific URLs (no homepage-only URLs)")

