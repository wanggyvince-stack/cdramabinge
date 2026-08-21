#!/usr/bin/env python3
"""Batch 4: Insert 70 expansion dramas into cdrama.db (Step 10.1)"""
import json
import sqlite3
import os

BASE = '/Coze/Drive/CDrama_Database/cdrama-database'
DB_PATH = os.path.join(BASE, 'data/cdrama.db')

EXPANSION_DRAMAS = [
    {"slug": "the-long-season", "tmdb_id": 225008, "original_title": "漫长的季节", "en_title": "The Long Season", "year": 2023, "rating": 9.4, "genres": ["drama","crime","thriller"], "mood_tags": ["intense","mindbending"]},
    {"slug": "the-long-night", "tmdb_id": 105053, "original_title": "沉默的真相", "en_title": "The Long Night", "year": 2020, "rating": 9.0, "genres": ["thriller","crime","mystery"], "mood_tags": ["intense","wanna_cry"]},
    {"slug": "the-bad-kids", "tmdb_id": 104960, "original_title": "隐秘的角落", "en_title": "The Bad Kids", "year": 2020, "rating": 8.8, "genres": ["thriller","crime","mystery"], "mood_tags": ["intense","spooky"]},
    {"slug": "three-body", "tmdb_id": 204541, "original_title": "三体", "en_title": "Three-Body", "year": 2023, "rating": 8.8, "genres": ["sci_fi","mystery"], "mood_tags": ["mindbending","intense"]},
    {"slug": "mysterious-lotus-casebook", "tmdb_id": 230835, "original_title": "莲花楼", "en_title": "Mysterious Lotus Casebook", "year": 2023, "rating": 8.5, "genres": ["wuxia","mystery"], "mood_tags": ["light_fun","aesthetic"]},
    {"slug": "blossoms-shanghai", "tmdb_id": 106841, "original_title": "繁花", "en_title": "Blossoms Shanghai", "year": 2024, "rating": 8.7, "genres": ["drama","romance"], "mood_tags": ["aesthetic","romantic"]},
    {"slug": "minning-town", "tmdb_id": 116586, "original_title": "山海情", "en_title": "Minning Town", "year": 2021, "rating": 9.2, "genres": ["drama"], "mood_tags": ["wanna_cry","empowering"]},
    {"slug": "the-age-of-awakening", "tmdb_id": 117954, "original_title": "觉醒年代", "en_title": "The Age of Awakening", "year": 2021, "rating": 9.3, "genres": ["historical","drama"], "mood_tags": ["empowering"]},
    {"slug": "the-longest-day-in-changan", "tmdb_id": 90768, "original_title": "长安十二时辰", "en_title": "The Longest Day in Chang'an", "year": 2019, "rating": 8.1, "genres": ["historical","thriller","action"], "mood_tags": ["intense","aesthetic"]},
    {"slug": "eternal-love", "tmdb_id": 69316, "original_title": "三生三世十里桃花", "en_title": "Eternal Love", "year": 2017, "rating": 6.4, "genres": ["fantasy","romance"], "mood_tags": ["romantic","aesthetic"]},
    {"slug": "story-of-yanxi-palace", "tmdb_id": 81133, "original_title": "延禧攻略", "en_title": "Story of Yanxi Palace", "year": 2018, "rating": 7.1, "genres": ["historical","drama"], "mood_tags": ["intense","romantic"]},
    {"slug": "princess-agents", "tmdb_id": 71673, "original_title": "楚乔传", "en_title": "Princess Agents", "year": 2017, "rating": 5.3, "genres": ["wuxia","action","drama"], "mood_tags": ["empowering","intense"]},
    {"slug": "hikaru-no-go", "tmdb_id": 112217, "original_title": "棋魂", "en_title": "Hikaru no Go", "year": 2020, "rating": 8.6, "genres": ["youth","drama"], "mood_tags": ["wanna_cry","empowering"]},
    {"slug": "the-rise-of-phoenixes", "tmdb_id": 81667, "original_title": "天盛长歌", "en_title": "The Rise of Phoenixes", "year": 2018, "rating": 8.1, "genres": ["historical","drama"], "mood_tags": ["intense","aesthetic"]},
    {"slug": "strange-tales-of-tang-dynasty", "tmdb_id": 211089, "original_title": "唐朝诡事录", "en_title": "Strange Tales of Tang Dynasty", "year": 2022, "rating": 8.1, "genres": ["mystery","historical","wuxia"], "mood_tags": ["spooky","mindbending"]},
    {"slug": "the-blood-of-youth", "tmdb_id": 216943, "original_title": "少年歌行", "en_title": "The Blood of Youth", "year": 2022, "rating": 8.3, "genres": ["wuxia","action"], "mood_tags": ["light_fun","aesthetic"]},
    {"slug": "legend-of-fei", "tmdb_id": 95834, "original_title": "有翡", "en_title": "Legend of Fei", "year": 2020, "rating": 5.6, "genres": ["wuxia","romance"], "mood_tags": ["romantic","empowering"]},
    {"slug": "who-rules-the-world", "tmdb_id": 127323, "original_title": "且试天下", "en_title": "Who Rules the World", "year": 2022, "rating": 5.6, "genres": ["wuxia","romance"], "mood_tags": ["romantic","aesthetic"]},
    {"slug": "sword-snow-stride", "tmdb_id": 89614, "original_title": "雪中悍刀行", "en_title": "Sword Snow Stride", "year": 2021, "rating": 5.9, "genres": ["wuxia","action"], "mood_tags": ["intense","empowering"]},
    {"slug": "day-and-night", "tmdb_id": 73982, "original_title": "白夜追凶", "en_title": "Day and Night", "year": 2017, "rating": 8.9, "genres": ["thriller","crime"], "mood_tags": ["intense","mindbending"]},
    {"slug": "ordinary-greatness", "tmdb_id": 203042, "original_title": "警察荣誉", "en_title": "Ordinary Greatness", "year": 2022, "rating": 8.5, "genres": ["crime","drama"], "mood_tags": ["light_fun","empowering"]},
    {"slug": "thirteen-years-of-dust", "tmdb_id": 211927, "original_title": "尘封十三载", "en_title": "Thirteen Years of Dust", "year": 2023, "rating": 8.1, "genres": ["thriller","crime"], "mood_tags": ["intense","mindbending"]},
    {"slug": "young-blood", "tmdb_id": 91657, "original_title": "大宋少年志", "en_title": "Young Blood", "year": 2019, "rating": 8.2, "genres": ["historical","mystery","action"], "mood_tags": ["light_fun","mindbending"]},
    {"slug": "the-imperial-coroner", "tmdb_id": 124595, "original_title": "御赐小仵作", "en_title": "The Imperial Coroner", "year": 2021, "rating": 8.0, "genres": ["historical","mystery"], "mood_tags": ["light_fun","mindbending"]},
    {"slug": "moral-peanuts-finale", "tmdb_id": 320986, "original_title": "毛骗终结篇", "en_title": "Moral Peanuts Finale", "year": 2015, "rating": 9.7, "genres": ["thriller","crime"], "mood_tags": ["mindbending","intense"]},
    {"slug": "i-am-a-criminal-police", "tmdb_id": 233971, "original_title": "我是刑警", "en_title": "I Am a Criminal Police", "year": 2024, "rating": 8.6, "genres": ["crime","drama"], "mood_tags": ["intense","empowering"]},
    {"slug": "the-borderlands", "tmdb_id": 252636, "original_title": "边水往事", "en_title": "The Borderlands", "year": 2024, "rating": 7.9, "genres": ["crime","action"], "mood_tags": ["intense","spooky"]},
    {"slug": "the-heart-of-genius", "tmdb_id": 206489, "original_title": "天才基本法", "en_title": "The Heart of Genius", "year": 2022, "rating": 7.8, "genres": ["sci_fi","drama"], "mood_tags": ["mindbending","wanna_cry"]},
    {"slug": "guardian", "tmdb_id": 80837, "original_title": "镇魂", "en_title": "Guardian", "year": 2018, "rating": 6.4, "genres": ["sci_fi","fantasy"], "mood_tags": ["spooky","intense"]},
    {"slug": "rattan", "tmdb_id": 120199, "original_title": "司藤", "en_title": "Rattan", "year": 2021, "rating": 7.0, "genres": ["sci_fi","fantasy","romance"], "mood_tags": ["aesthetic","spooky"]},
    {"slug": "the-bionic-life", "tmdb_id": 136443, "original_title": "仿生人间", "en_title": "The Bionic Life", "year": 2023, "rating": 7.0, "genres": ["sci_fi","thriller"], "mood_tags": ["spooky","intense"]},
    {"slug": "with-you", "tmdb_id": 78985, "original_title": "最好的我们", "en_title": "With You", "year": 2016, "rating": 8.9, "genres": ["youth","romance"], "mood_tags": ["romantic","wanna_cry"]},
    {"slug": "my-huckleberry-friends", "tmdb_id": 78986, "original_title": "你好，旧时光", "en_title": "My Huckleberry Friends", "year": 2017, "rating": 8.6, "genres": ["youth","romance"], "mood_tags": ["romantic","wanna_cry"]},
    {"slug": "suddenly-this-summer", "tmdb_id": 93362, "original_title": "忽而今夏", "en_title": "Suddenly This Summer", "year": 2018, "rating": 8.2, "genres": ["youth","drama"], "mood_tags": ["wanna_cry","romantic"]},
    {"slug": "i-dont-want-to-be-friends-with-you", "tmdb_id": 104083, "original_title": "我才不要和你做朋友呢", "en_title": "I Don't Want to Be Friends With You", "year": 2020, "rating": 8.1, "genres": ["youth","comedy"], "mood_tags": ["light_fun","wanna_cry"]},
    {"slug": "nothing-but-you", "tmdb_id": 210580, "original_title": "爱情而已", "en_title": "Nothing But You", "year": 2023, "rating": 8.2, "genres": ["youth","romance"], "mood_tags": ["romantic","empowering"]},
    {"slug": "when-i-fly-towards-you", "tmdb_id": 228547, "original_title": "当我飞奔向你", "en_title": "When I Fly Towards You", "year": 2023, "rating": 8.0, "genres": ["youth","romance"], "mood_tags": ["romantic","light_fun"]},
    {"slug": "the-romance-of-tiger-and-rose", "tmdb_id": 103635, "original_title": "传闻中的陈芊芊", "en_title": "The Romance of Tiger and Rose", "year": 2020, "rating": 7.3, "genres": ["comedy","fantasy"], "mood_tags": ["light_fun","romantic"]},
    {"slug": "my-heroic-husband", "tmdb_id": 118759, "original_title": "赘婿", "en_title": "My Heroic Husband", "year": 2021, "rating": 6.3, "genres": ["comedy","historical"], "mood_tags": ["light_fun","mindbending"]},
    {"slug": "hilarious-family", "tmdb_id": 235195, "original_title": "兰闺喜事", "en_title": "Hilarious Family", "year": 2024, "rating": 7.8, "genres": ["comedy","historical"], "mood_tags": ["light_fun"]},
    {"slug": "romance-on-the-farm", "tmdb_id": 229146, "original_title": "田耕纪", "en_title": "Romance on the Farm", "year": 2023, "rating": 7.7, "genres": ["comedy","historical"], "mood_tags": ["light_fun","romantic"]},
    {"slug": "love-is-sweet", "tmdb_id": 110632, "original_title": "半是蜜糖半是伤", "en_title": "Love Is Sweet", "year": 2020, "rating": 7.4, "genres": ["comedy","romance"], "mood_tags": ["romantic","light_fun"]},
    {"slug": "dating-in-the-kitchen", "tmdb_id": 109866, "original_title": "我，喜欢你", "en_title": "Dating in the Kitchen", "year": 2020, "rating": 7.1, "genres": ["comedy","romance"], "mood_tags": ["light_fun","romantic"]},
    {"slug": "tientsin-mystic", "tmdb_id": 73031, "original_title": "河神", "en_title": "Tientsin Mystic", "year": 2017, "rating": 8.2, "genres": ["mystery","thriller"], "mood_tags": ["spooky","intense"]},
    {"slug": "psych-hunter", "tmdb_id": 113621, "original_title": "心宅猎人", "en_title": "Psych-Hunter", "year": 2020, "rating": 7.0, "genres": ["mystery","thriller"], "mood_tags": ["spooky","mindbending"]},
    {"slug": "the-spirealm", "tmdb_id": 245292, "original_title": "死亡万花筒", "en_title": "The Spirealm", "year": 2024, "rating": 7.3, "genres": ["fantasy","thriller"], "mood_tags": ["spooky","intense"]},
    {"slug": "the-demon-hunters-romance", "tmdb_id": 138291, "original_title": "无忧渡", "en_title": "The Demon Hunter's Romance", "year": 2023, "rating": 6.5, "genres": ["fantasy","mystery"], "mood_tags": ["spooky","aesthetic"]},
    {"slug": "fangs-of-fortune", "tmdb_id": 239389, "original_title": "大梦归离", "en_title": "Fangs of Fortune", "year": 2024, "rating": 5.1, "genres": ["fantasy","romance"], "mood_tags": ["aesthetic","spooky"]},
    {"slug": "the-legend-of-shen-li", "tmdb_id": 207668, "original_title": "与凤行", "en_title": "The Legend of Shen Li", "year": 2024, "rating": 7.2, "genres": ["fantasy","action"], "mood_tags": ["aesthetic","romantic"]},
    {"slug": "one-and-only", "tmdb_id": 129117, "original_title": "周生如故", "en_title": "One and Only", "year": 2021, "rating": 7.4, "genres": ["historical","romance"], "mood_tags": ["aesthetic","wanna_cry"]},
    {"slug": "good-bye-my-princess", "tmdb_id": 86857, "original_title": "东宫", "en_title": "Good Bye My Princess", "year": 2019, "rating": 7.6, "genres": ["historical","romance"], "mood_tags": ["aesthetic","wanna_cry"]},
    {"slug": "love-and-destiny", "tmdb_id": 90819, "original_title": "宸汐缘", "en_title": "Love and Destiny", "year": 2019, "rating": 8.3, "genres": ["fantasy","romance"], "mood_tags": ["aesthetic","romantic"]},
    {"slug": "the-blossoming-of-mountain-flowers", "tmdb_id": 263290, "original_title": "山花烂漫时", "en_title": "The Blossoming of Mountain Flowers", "year": 2024, "rating": 9.6, "genres": ["drama"], "mood_tags": ["empowering","wanna_cry"]},
    {"slug": "to-the-wonder", "tmdb_id": 253747, "original_title": "我的阿勒泰", "en_title": "To the Wonder", "year": 2024, "rating": 8.9, "genres": ["drama","youth"], "mood_tags": ["aesthetic","light_fun"]},
    {"slug": "strange-tales-of-tang-dynasty-ii", "tmdb_id": 325397, "original_title": "唐朝诡事录之西行", "en_title": "Strange Tales of Tang Dynasty II", "year": 2024, "rating": 8.6, "genres": ["mystery","historical"], "mood_tags": ["spooky","mindbending"]},
    {"slug": "the-legend-of-tianxing", "tmdb_id": 201776, "original_title": "天行健", "en_title": "The Legend of Tianxing", "year": 2024, "rating": 8.8, "genres": ["historical","action"], "mood_tags": ["empowering","intense"]},
    {"slug": "the-story-of-alley", "tmdb_id": 274260, "original_title": "小巷人家", "en_title": "The Story of Alley", "year": 2024, "rating": 8.3, "genres": ["drama"], "mood_tags": ["light_fun","wanna_cry"]},
    {"slug": "guardians-of-the-dafeng", "tmdb_id": 233912, "original_title": "大奉打更人", "en_title": "Guardians of the Dafeng", "year": 2024, "rating": 5.4, "genres": ["fantasy","comedy"], "mood_tags": ["light_fun","spooky"]},
    {"slug": "the-story-of-pearl-girl", "tmdb_id": 240440, "original_title": "珠帘玉幕", "en_title": "The Story of Pearl Girl", "year": 2024, "rating": 7.6, "genres": ["historical","drama"], "mood_tags": ["empowering","aesthetic"]},
    {"slug": "legend-of-zang-hai", "tmdb_id": 252640, "original_title": "藏海传", "en_title": "Legend of Zang Hai", "year": 2025, "rating": 8.0, "genres": ["historical","drama"], "mood_tags": ["aesthetic","intense"]},
    {"slug": "bleaching", "tmdb_id": 259188, "original_title": "漂白", "en_title": "Bleaching", "year": 2025, "rating": 8.0, "genres": ["thriller","crime"], "mood_tags": ["intense","spooky"]},
    {"slug": "glorious-beauty-of-tang", "tmdb_id": 243083, "original_title": "国色芳华", "en_title": "Glorious Beauty of Tang", "year": 2025, "rating": 7.8, "genres": ["historical","romance"], "mood_tags": ["aesthetic","empowering"]},
    {"slug": "see-her-again", "tmdb_id": 236726, "original_title": "叠影狙击", "en_title": "See Her Again", "year": 2024, "rating": 7.0, "genres": ["thriller","crime"], "mood_tags": ["intense","spooky"]},
    {"slug": "regeneration", "tmdb_id": 236617, "original_title": "新生", "en_title": "Regeneration", "year": 2024, "rating": 7.8, "genres": ["thriller","mystery"], "mood_tags": ["mindbending","intense"]},
    {"slug": "medal-of-the-republic", "tmdb_id": 134983, "original_title": "功勋", "en_title": "Medal of the Republic", "year": 2021, "rating": 9.0, "genres": ["drama","historical"], "mood_tags": ["empowering","wanna_cry"]},
    {"slug": "the-daughter-of-the-mountain", "tmdb_id": 205017, "original_title": "大山的女儿", "en_title": "The Daughter of the Mountain", "year": 2022, "rating": 9.3, "genres": ["drama"], "mood_tags": ["wanna_cry","empowering"]},
    {"slug": "like-a-flowing-river", "tmdb_id": 84856, "original_title": "大江大河", "en_title": "Like a Flowing River", "year": 2018, "rating": 8.8, "genres": ["drama","historical"], "mood_tags": ["empowering","wanna_cry"]},
    {"slug": "all-is-well", "tmdb_id": 87544, "original_title": "都挺好", "en_title": "All Is Well", "year": 2019, "rating": 7.9, "genres": ["drama"], "mood_tags": ["wanna_cry","empowering"]},
    {"slug": "go-go-squid", "tmdb_id": 82817, "original_title": "亲爱的热爱的", "en_title": "Go Go Squid!", "year": 2019, "rating": 6.6, "genres": ["youth","romance"], "mood_tags": ["romantic","light_fun"]},
    {"slug": "legend-of-yunxi", "tmdb_id": 80455, "original_title": "芸汐传", "en_title": "Legend of Yunxi", "year": 2018, "rating": 6.0, "genres": ["historical","romance"], "mood_tags": ["romantic","light_fun"]},
]


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing slugs
    existing = set(row[0] for row in cursor.execute("SELECT slug FROM dramas").fetchall())
    print(f"Existing slugs in DB: {len(existing)}")

    # Check for slug conflicts
    new_slugs = [d['slug'] for d in EXPANSION_DRAMAS]
    conflicts = set(new_slugs) & existing
    if conflicts:
        print(f"WARNING: Slug conflicts found: {conflicts}")

    inserted = 0
    skipped = 0

    for drama in EXPANSION_DRAMAS:
        slug = drama['slug']
        if slug in existing:
            print(f"SKIP: {slug} already exists")
            skipped += 1
            continue

        titles_json = json.dumps({"en": drama['en_title'], "zh": drama['original_title']}, ensure_ascii=False)
        genres_json = json.dumps(drama['genres'], ensure_ascii=False)
        mood_tags_json = json.dumps(drama['mood_tags'], ensure_ascii=False)

        cursor.execute("""
            INSERT OR IGNORE INTO dramas
            (slug, tmdb_id, original_title, original_language, titles_json, genres, mood_tags,
             rating, year, tags, status, synopses_json, episodes, poster_url, backdrop_url,
             similar_dramas_json, streaming_json, embedding_json)
            VALUES (?, ?, ?, 'zh', ?, ?, ?, ?, ?, '[]', 'Completed', '{}', NULL, NULL, NULL, '[]', '{}', NULL)
        """, (
            slug, drama['tmdb_id'], drama['original_title'],
            titles_json, genres_json, mood_tags_json,
            drama['rating'], drama['year']
        ))
        inserted += 1
        print(f"INSERT: {slug} ({drama['original_title']}, {drama['year']})")

    conn.commit()

    # Verify count
    total = cursor.execute("SELECT COUNT(*) FROM dramas").fetchone()[0]
    print(f"\n=== SUMMARY ===")
    print(f"Inserted: {inserted}")
    print(f"Skipped (already exists): {skipped}")
    print(f"Total dramas in DB: {total}")
    assert total == 120, f"Expected 120 dramas, got {total}"

    conn.close()
    print("Done!")


if __name__ == '__main__':
    main()
