#!/usr/bin/env python3
"""
Batch update drama synopses and posters from TVmaze data.

This script updates the cdrama.db database with real poster URLs and English
synopses fetched from TVmaze API. It is idempotent - safe to run multiple times.

Rules:
- synopses_json: Only updates entries containing "captivating" (placeholder data)
- poster_url: Only updates when current value is empty, null, or contains "placeholder"
"""

import json
import os
import re
import sqlite3
from datetime import datetime


def clean_html(html_text):
    """Remove HTML tags and clean up whitespace from TVmaze summary."""
    if not html_text:
        return ""
    # Remove all HTML tags
    text = re.sub(r'<[^>]+>', '', html_text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# TVmaze data collected for 14 dramas
# Format: slug -> {poster_url, synopsis_clean, tvmaze_id, tvmaze_name}
TVMAZE_DATA = {
    "ashes-of-love": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/163/409322.jpg",
        "synopsis": "The Flower Deity dies after giving birth to a daughter, Jin Mi. She has a premonition that her daughter will suffer a great love trial, thus before dying, she gives her a magical pill that prevents her from feeling and expressing romantic love. This causes Jin Mi to become the brunt of many jokes when she gets tangled in a love triangle with Heavenly Prince Xu Feng and the ambitious Night Deity Run Yu. Jin Mi is tricked into thinking her father died at the hands of Xu Feng and kills him, coughing up the magic pill in the process. Xu Feng is revived a decade later as the Demon Lord, and wages war against Run Yu, who has now ascended the throne as Heavenly Emperor. Jin Mi is caught between a rock and a hard place, and ultimately sacrifices herself to return peace to the world.",
        "tvmaze_id": 38155,
        "tvmaze_name": "Heavy Sweetness, Ash-like Frost",
    },
    "hidden-love": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/465/1164886.jpg",
        "synopsis": "Sang Zhi falls in love with Duan Jia Xu, a boy who often comes to her house to play games in her older brother's room. He is seven years older than her. Sang Zhi had a crush on Duan Jia Xu when she was young, but they lost contact with each other for some reason. After she graduates, she joins the university in the city he is in, and during their day-to-day intimate and close interaction, they slowly fall in love.",
        "tvmaze_id": 69342,
        "tvmaze_name": "Hidden Love",
    },
    "joy-of-life": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/579/1448260.jpg",
        "synopsis": "When Fan Xian was fifteen years old, his father Fan Jian and the leader of Supervisory Ministry sent a master who was good at using poison and Kungfu to teach him. Four years later, Fan Xian already have powerful Kungfu, and his life was changed. In his adventure life, with the help of friends who are full of justice, Fan Xian has gone through many difficulties and overcome all kinds of difficulties. In the process, He feasts on the warmth and coldness of the world, but he still follow his heart, firmly own ideal.",
        "tvmaze_id": 45302,
        "tvmaze_name": "Joy of Life",
    },
    "love-between-fairy-and-devil": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/418/1045751.jpg",
        "synopsis": "Adapted from the novel \"Cang Lan Jue\" (苍兰诀) by Jiu Lu Fei Xiang (九鹭非香). According to legend, in order to obtain terrible power, Dongfang Qing Cang of the Moon Tribe became an emotionless monster. He killed his father, seized the position of Moon Supreme and led an army of 100,000 Moon Tribe soldiers on a path of devastation. Shuiyuntian (the immortal fairy realm), Cangyan Sea (the Moon Tribe), and Yunmeng Lake (the mortal world) were in grave danger. To save the world and stop Dongfang Qing Cang and his army, the first God of War of Shuiyuntian destroyed her primordial spirit. Dongfang Qing Cang's army and primordial spirit were sealed and his body was locked away in Haotian Tower under the immortal bonds of the Haotian Matrix. However, if his primordial spirit was restored and Dongfang Qing Cang were to break free from his tower, the world would be in danger once more. Legend says that only the Goddess of Xishan can prevent this catastrophe, but she vanished without a trace. 30,000 years after the first God of War's sacrifice, there was a disturbance in the Haotian Matrix. While attempting to help the new God of War reinforce the Matrix, Orchid, a weak and low-ranking flower fairy, accidentally finds herself inside Haotian Tower and face-to-face with the Moon Supreme himself. Their encounter sets off a chain of events that threatens to change the fate of the world once again.",
        "tvmaze_id": 63443,
        "tvmaze_name": "Love Between Fairy and Devil",
    },
    "love-like-the-galaxy": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/415/1038524.jpg",
        "synopsis": "The young Cheng Shao Shang was left behind because her parents had gone off to fight in the war. In order to protect herself from her scheming aunt, she had to be extra diligent while pretending to be the opposite. However, years of estrangement have made it difficult for them to become family again. Lacking love her whole life, Cheng Shao Shang is both pragmatic and insecure in choosing a partner for marriage. She encounters three men - the emperor's adopted son Ling Bu Yi, the talented Yuan Shen of Bailu Mountain, and the aristocrat Lou Yao who each have their pros and cons. Although the road to love is bumpy, she never regrets any choice she makes. Through her interactions with Ling Bu Yi, she unintentionally becomes involved in the mystery surrounding his family and his identity. The two grow from their experiences and work together, upholding the righteousness in their hearts to resolve a national crisis.",
        "tvmaze_id": 62994,
        "tvmaze_name": "Love Like the Galaxy",
    },
    "meet-yourself": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/439/1098436.jpg",
        "synopsis": "Because of the death of her best friend, Xu Hongdou's life and work falls into a slump. She goes to the \"windy courtyard\" in Yun Miao Village, Dali, to recuperate by herself. There, she meets Xie Zhiyao, a local who quit his high-paying job and has returned to his hometown to start a business, with a group of peers from big cities. Xie Zhiyao begins to see Xu Hongdou's kindness and seriousness. He invites her to use her years of experience in the hotel industry to help local employees improve their service awareness and help develop Yun Miao Village's cultural tourism business. At the same time, Xu Hongdou is moved by Xie Zhiyao's ideal of building a hometown so that the villagers can be independent and lead a purposeful life. The two fall in love and finally came together. As they work together they re-examin their past, help and inspire each other, start to heal and gain the strength to begin their lives again in this \"windy place\".",
        "tvmaze_id": 66181,
        "tvmaze_name": "Meet Yourself",
    },
    "nirvana-in-fire": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/69/174608.jpg",
        "synopsis": "During the Datong era of the Southern Liang Dynasty, Northern Wei sent troops southward and General Lin Xie took his only child, the 17 year old Lin Shu to the battlefield. Unexpectedly, Lin Xie was framed by a political rival, causing the unjust deaths of seventy thousand Chi Yan army soldiers, just after they drove off the hostile Wei forces. Fortunately, Lin Shu was rescued by a loyal subordinate, although he barely escaped with his life.",
        "tvmaze_id": 7135,
        "tvmaze_name": "Nirvana in Fire",
    },
    "reset": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/389/974203.jpg",
        "synopsis": "Game designer Xiao He Yun and university student Li Shi Qing are caught in a time loop after a bus explosion and must work hard to put a stop to it. Xiao He Yun and Li Shi Qing are two ordinary people forced to fight for their lives repeatedly following a bizarre cycle that occurred after a bus explosion. The passengers have different identities and experiences, they have their difficulties and their own expectations for the future. The truth is hidden in layers of mist, but justice will ultimately prevail.",
        "tvmaze_id": 59985,
        "tvmaze_name": "Reset",
    },
    "story-of-kunning": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/463/1159846.jpg",
        "synopsis": "Chinese drama Granting You a Dreamlike Life is adapted from Shi Jing's novel A Lady's Tranquility. It is directed by Zhu Ruibin (Ashes of Love), starring Bai Lu (Ordinary Greatness, One and Only), Zhang Linghe (Love Between Fairy and Devil, Flourish in Time), and Wang Xingyue (Delicacies Destiny). Jiang Xue Ning (played by Bai Lu) had gone to great lengths to become empress, but was forced to commit suicide during a palace mutiny. Now, Jiang Xue Ning's dream is to get away from power and have control over her own life. However, by mistake, she has joined the palace as a tutor and becomes a student of the imperial master Xie Gui (played by Zhang Linghe). While receiving Xie Gui's teachings, Jiang Xue Ning secretly plans to stop Yan Lin's (played by Zhou Junwei) upcoming \"Blood Crown Ceremony.\" With Jiang Xue Ning and Xie Gui's plan, the Yan family's lives were saved. After the \"Blood Crown Ceremony,\" Jiang Xue Ning is inadvertently involved in the imperial court's plan to eliminate those rebels against Pingnan King, and infiltrates into the enemy camp with Zhang Jie (played by Wang Xingyue). When the enemy country Yue comes to invade, the Princess Shen Zhi Yi (played by Liu Juning) resolutely embarks on the road of peace. In order to save her friend Shen Zhi Yi, Jiang Xue Ning goes north with Xie Gu to invade Yue. In the midst of many crises, Xie Gu protects Jiang Xue Ning even at the risk of hurting himself, and the two of them grow to love each other. However, a bigger conspiracy gradually surfaced, which pointed to the truth of the Pingnan King incident twenty years ago. In the end, Jiang Xue Ning and Xie Gui teamed up to uncover the truth of that year, Jiang Xue Ning also used love to convert Xie Gui, and the two finally became a couple.",
        "tvmaze_id": 68812,
        "tvmaze_name": "Story of Kunning Palace",
    },
    "story-of-minglan": {
        "poster_url": None,  # Not found on TVmaze
        "synopsis": None,     # Not found on TVmaze
        "tvmaze_id": None,
        "tvmaze_name": None,
        "note": "NOT FOUND on TVmaze - searched multiple terms (The Story of Minglan, Story of Minglan, Minglan, 知否, etc.)",
    },
    "the-knockout": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/441/1103920.jpg",
        "synopsis": "After 20 years of perseverance, the passionate young man eventually became the people's hero.",
        "tvmaze_id": 66374,
        "tvmaze_name": "The Knockout",
    },
    "the-longest-promise": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/463/1159687.jpg",
        "synopsis": "The story takes place in Kong Sang Continent, and revolves around the tumultuous love story between Zhu Yan, princess of the Chi Yi Tribe and Shi Ying, a royal prince. Shi Ying's mother was framed, and he was banished to Jiu Yi Mountain to cultivate. Originally focused on nothing but cultivation, he began to develop romantic feelings for Zhu Yan, his disciple. However because of their relationship as teacher and student, both of them do not voice out their feelings. Fate also stands in their way when they stood on opposite sides in political struggle and undergo life and death situations. However, they eventually put aside their issues, and work together hand-in-hand to protect Kong Sang Continent.",
        "tvmaze_id": 69143,
        "tvmaze_name": "The Longest Promise",
    },
    "the-untamed": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/236/592104.jpg",
        "synopsis": "The pugilist world is ruled by the powerful Wen clan, which dominates over the smaller Lan, Jiang, Nie and Jin households. The carefree Wei Wuxian becomes fast friends with the righteous Lan Wangji, and during their adventures, the pair find out that the head of the Wen clan is the evil mastermind behind a series of plots that would wreak havoc upon the lands. Wei Wuxian's attempts to protect the innocent members of the Wen clan from unfair persecution leads to disaster, and he goes MIA in the process. Wei Wuxian reappears sixteen years later, and works together with good friend Lan Wangji to solve a series of murder mysteries, eventually finding and defeating the true culprit.",
        "tvmaze_id": 42806,
        "tvmaze_name": "The Untamed",
    },
    "word-of-honor": {
        "poster_url": "https://static.tvmaze.com/uploads/images/original_untouched/298/745349.jpg",
        "synopsis": "Zhou Zi Shu gets embroiled in a conspiracy in the martial arts world after quitting his job as the leader of an organization tasked with protecting royalty. He meets Wen Ke Xing, a mysterious martial artist who escapes from the Ghost Valley to avenge his parents' deaths. They become fast friends and embark on an adventure to find a legendary treasure that will give its owner ultimate power over jianghu.",
        "tvmaze_id": 53806,
        "tvmaze_name": "Word of Honor",
    },
}


def is_placeholder_synopsis(synopses_json_str):
    """Check if synopses_json contains placeholder text (has 'captivating')."""
    if not synopses_json_str:
        return True
    return "captivating" in synopses_json_str.lower()


def needs_poster_update(poster_url):
    """Check if poster_url needs updating (null, empty, or placeholder)."""
    if not poster_url:
        return True
    return "placeholder" in poster_url.lower()


def main():
    # Resolve database path relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "..", "data", "cdrama.db")
    db_path = os.path.normpath(db_path)

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    stats = {"updated": 0, "skipped": 0, "not_found": 0, "synopsis_updated": 0, "poster_updated": 0}

    print("=" * 70)
    print("TVmaze Data Batch Update Script")
    print(f"Database: {db_path}")
    print(f"Timestamp: {now}")
    print("=" * 70)

    for slug, data in sorted(TVMAZE_DATA.items()):
        print(f"\n--- {slug} ---")

        # Check if TVmaze had this show
        if data["tvmaze_name"] is None:
            note = data.get("note", "Not found on TVmaze")
            print(f"  SKIPPED: {note}")
            stats["not_found"] += 1
            continue

        print(f"  TVmaze: {data['tvmaze_name']} (id={data['tvmaze_id']})")

        # Fetch current data from DB
        cursor.execute(
            "SELECT id, poster_url, synopses_json FROM dramas WHERE slug = ?",
            (slug,)
        )
        row = cursor.fetchone()

        if not row:
            print(f"  WARNING: slug '{slug}' not found in database, skipping")
            stats["skipped"] += 1
            continue

        drama_id, current_poster, current_synopses = row
        updates = {}

        # Check synopsis
        if is_placeholder_synopsis(current_synopses) and data["synopsis"]:
            new_synopses_json = json.dumps({"en": data["synopsis"]}, ensure_ascii=False)
            updates["synopses_json"] = new_synopses_json
            stats["synopsis_updated"] += 1
            print(f"  SYNOPSIS: Updated ({len(data['synopsis'])} chars)")
        elif data["synopsis"]:
            print(f"  SYNOPSIS: Already has real data, skipping")
        else:
            print(f"  SYNOPSIS: No TVmaze data available")

        # Check poster
        if needs_poster_update(current_poster) and data["poster_url"]:
            updates["poster_url"] = data["poster_url"]
            stats["poster_updated"] += 1
            print(f"  POSTER: Updated -> {data['poster_url']}")
        elif needs_poster_update(current_poster):
            print(f"  POSTER: Needs update but no TVmaze data available")
        else:
            print(f"  POSTER: Already has real data, skipping")

        # Apply updates
        if updates:
            updates["updated_at"] = now
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            values = list(updates.values()) + [drama_id]
            cursor.execute(
                f"UPDATE dramas SET {set_clause} WHERE id = ?",
                values
            )
            stats["updated"] += 1
            print(f"  RESULT: {len(updates) - 1} field(s) updated in DB")
        else:
            stats["skipped"] += 1
            print(f"  RESULT: No updates needed")

    conn.commit()
    conn.close()

    # Print summary
    print("\n" + "=" * 70)
    print("UPDATE SUMMARY")
    print("=" * 70)
    print(f"  Dramas processed:     {len(TVMAZE_DATA)}")
    print(f"  Dramas updated:       {stats['updated']}")
    print(f"  Synopsis updated:     {stats['synopsis_updated']}")
    print(f"  Poster updated:       {stats['poster_updated']}")
    print(f"  Skipped (no change):  {stats['skipped']}")
    print(f"  Not found on TVmaze:  {stats['not_found']}")
    print("=" * 70)

    # Verification: show final state of all 15 dramas (14 + a-little-reunion)
    print("\n\nFINAL STATE VERIFICATION (all 15 target dramas):")
    print("-" * 70)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    all_slugs = list(TVMAZE_DATA.keys()) + ["a-little-reunion"]
    cursor.execute(
        """SELECT slug, original_title, year, poster_url, synopses_json
           FROM dramas WHERE slug IN ({}) ORDER BY slug""".format(
            ",".join("?" * len(all_slugs))
        ),
        all_slugs
    )

    for row in cursor.fetchall():
        slug, title, year, poster, synopses = row
        has_poster = "YES" if (poster and "placeholder" not in poster.lower()) else "NO"
        has_synopsis = "REAL" if (synopses and "captivating" not in synopses.lower()) else "PLACEHOLDER"
        poster_preview = (poster[:50] + "...") if poster and len(poster) > 50 else (poster or "NULL")
        synopsis_preview = synopses[:60] + "..." if synopses and len(synopses) > 60 else synopses
        print(f"  {slug:35s} | poster={has_poster:3s} | synopsis={has_synopsis:11s} | {title} ({year})")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
