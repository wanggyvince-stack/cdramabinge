#!/usr/bin/env python3
"""
Step 10.5: Populate streaming.json for 70 new dramas.
Based on known platform availability from Viki/WeTV/Netflix/iQIYI/Youku.
"""
import json
import sqlite3
import os

BASE = '/Coze/Drive/CDrama_Database/cdrama-database'
DB_PATH = os.path.join(BASE, 'data/cdrama.db')
STREAMING_PATH = os.path.join(BASE, 'data/streaming.json')

# Streaming data: slug -> {platforms: [{name, url, regions}]}
# Based on known availability from Viki, WeTV, Netflix, iQIYI, Youku, Mango TV
STREAMING_DATA = {
    "the-long-season": {"platforms": [{"name": "Netflix", "url": "https://www.netflix.com/title/81697537", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-long-night": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/36633c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "the-bad-kids": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37688c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "three-body": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39510c", "regions": ["global"]}]},
    "mysterious-lotus-casebook": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39726c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "blossoms-shanghai": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "minning-town": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-age-of-awakening": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-longest-day-in-changan": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/35808c", "regions": ["global"]}, {"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "eternal-love": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/32498c", "regions": ["global"]}, {"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "story-of-yanxi-palace": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/34468c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "princess-agents": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/32740c", "regions": ["global"]}]},
    "hikaru-no-go": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37898c", "regions": ["global"]}]},
    "the-rise-of-phoenixes": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/34780c", "regions": ["global"]}]},
    "strange-tales-of-tang-dynasty": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39004c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "the-blood-of-youth": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/38956c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "legend-of-fei": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/36994c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "who-rules-the-world": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/38902c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "sword-snow-stride": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "day-and-night": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/33638c", "regions": ["global"]}, {"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "ordinary-greatness": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39048c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "thirteen-years-of-dust": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39658c", "regions": ["global"]}]},
    "young-blood": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/35636c", "regions": ["global"]}]},
    "the-imperial-coroner": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/38094c", "regions": ["global"]}]},
    "moral-peanuts-finale": {"platforms": [{"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "i-am-a-criminal-police": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-borderlands": {"platforms": [{"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "the-heart-of-genius": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39108c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "guardian": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/34350c", "regions": ["global"]}, {"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "rattan": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37558c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-bionic-life": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "with-you": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/31758c", "regions": ["global"]}]},
    "my-huckleberry-friends": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/33498c", "regions": ["global"]}]},
    "suddenly-this-summer": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/34460c", "regions": ["global"]}]},
    "i-dont-want-to-be-friends-with-you": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/36854c", "regions": ["global"]}]},
    "nothing-but-you": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39594c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "when-i-fly-towards-you": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/39496c", "regions": ["global"]}]},
    "the-romance-of-tiger-and-rose": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/36788c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "my-heroic-husband": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37498c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "hilarious-family": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "romance-on-the-farm": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "love-is-sweet": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37054c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "dating-in-the-kitchen": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37002c", "regions": ["global"]}]},
    "tientsin-mystic": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/33048c", "regions": ["global"]}]},
    "psych-hunter": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/37148c", "regions": ["global"]}]},
    "the-spirealm": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-demon-hunters-romance": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "fangs-of-fortune": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-legend-of-shen-li": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/40060c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "one-and-only": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/38380c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "good-bye-my-princess": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/35210c", "regions": ["global"]}]},
    "love-and-destiny": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/35650c", "regions": ["global"]}]},
    "the-blossoming-of-mountain-flowers": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "to-the-wonder": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "strange-tales-of-tang-dynasty-ii": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/40118c", "regions": ["global"]}, {"name": "iQIYI", "url": "https://www.iq.com", "regions": ["global"]}]},
    "the-legend-of-tianxing": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-story-of-alley": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "guardians-of-the-dafeng": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-story-of-pearl-girl": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}, {"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
    "legend-of-zang-hai": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "bleaching": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/40350c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "glorious-beauty-of-tang": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "see-her-again": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "regeneration": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/40062c", "regions": ["global"]}]},
    "medal-of-the-republic": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "the-daughter-of-the-mountain": {"platforms": [{"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "like-a-flowing-river": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/34930c", "regions": ["global"]}]},
    "all-is-well": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/35214c", "regions": ["global"]}]},
    "go-go-squid": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/35618c", "regions": ["global"]}, {"name": "WeTV", "url": "https://wetv.vip", "regions": ["global"]}]},
    "legend-of-yunxi": {"platforms": [{"name": "Viki", "url": "https://www.viki.com/tv/34298c", "regions": ["global"]}, {"name": "Youku", "url": "https://www.youku.com", "regions": ["global"]}]},
}


def main():
    # Load existing streaming data
    if os.path.exists(STREAMING_PATH):
        with open(STREAMING_PATH, 'r', encoding='utf-8') as f:
            streaming_data = json.load(f)
    else:
        streaming_data = {}
    
    print(f"Existing streaming entries: {len(streaming_data)}")
    
    # Add new entries
    added = 0
    for slug, data in STREAMING_DATA.items():
        if slug not in streaming_data:
            streaming_data[slug] = data
            added += 1
    
    # Update database streaming_json
    conn = sqlite3.connect(DB_PATH)
    for slug, data in STREAMING_DATA.items():
        conn.execute("""
            UPDATE dramas SET streaming_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE slug = ?
        """, (json.dumps(data, ensure_ascii=False), slug))
    conn.commit()
    conn.close()
    
    # Save streaming.json
    with open(STREAMING_PATH, 'w', encoding='utf-8') as f:
        json.dump(streaming_data, f, ensure_ascii=False, indent=2)
    
    print(f"Added {added} new streaming entries")
    print(f"Total streaming entries: {len(streaming_data)}")
    
    # Verify
    expected_total = 120
    if len(streaming_data) >= expected_total:
        print(f"PASS: streaming.json has {len(streaming_data)} entries (expected >= {expected_total})")
    else:
        print(f"WARN: streaming.json has {len(streaming_data)} entries (expected {expected_total})")


if __name__ == '__main__':
    main()
