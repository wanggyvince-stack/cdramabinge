#!/usr/bin/env python3
"""
CDrama Database v12.0 - Phase 3: DeepL Translation
====================================================
Translates English synopses to Vietnamese (VI), Thai (TH), Indonesian (ID)
using DeepL API Free.

Run from sandbox (needs internet for DeepL API).
"""

import sqlite3
import json
import os
import sys
import time
import re

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not found. Run: pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "data", "cdrama.db")

DEEPL_API_KEY = "4f4672cd-acf1-4ef6-8ee2-1d07c1c86465:fx"
DEEPL_URL = "https://api-free.deepl.com/v2/translate"

# Languages to translate
TARGET_LANGS = [
    {"code": "VI", "db_key": "vi", "name": "Vietnamese"},
    {"code": "TH", "db_key": "th", "name": "Thai"},
    {"code": "ID", "db_key": "id", "name": "Indonesian"},
]

BATCH_SIZE = 8  # DeepL supports up to 50 texts per request, but let's be conservative

# Terminology glossary for consistency
GLOSSARY = {
    "xianxia": {"vi": "tiên hiệp", "th": "เซียนเสีย", "id": "xianxia"},
    "wuxia": {"vi": "võ hiệp", "th": "กำลังภายใน", "id": "silat"},
    "cultivation": {"vi": "tu chân", "th": "ฝึกฝน", "id": "kultivasi"},
}


def check_deepl_usage():
    """Check DeepL API usage."""
    try:
        resp = requests.get(
            "https://api-free.deepl.com/v2/usage",
            headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("character_count", 0), data.get("character_limit", 1000000)
    except Exception as e:
        print(f"[WARN] Could not check DeepL usage: {e}")
        return 0, 1000000


def translate_texts(texts, target_lang):
    """Translate a batch of texts using DeepL API."""
    if not texts:
        return []
    
    data = {
        "target_lang": target_lang,
    }
    # DeepL API uses form data with repeated 'text' params
    form_data = [("target_lang", target_lang)]
    for t in texts:
        form_data.append(("text", t))
    
    try:
        resp = requests.post(
            DEEPL_URL,
            headers={
                "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=form_data,
            timeout=30
        )
        resp.raise_for_status()
        result = resp.json()
        return [t["text"] for t in result.get("translations", [])]
    except Exception as e:
        print(f"  [ERROR] DeepL API error ({target_lang}): {e}")
        return [None] * len(texts)


def validate_translation(text, target_lang_code):
    """Validate a translation result."""
    if not text or len(text.strip()) < 10:
        return False
    
    # Check for Chinese characters (shouldn't appear in VI/TH/ID translations)
    if re.search(r'[\u4e00-\u9fff]', text):
        return False
    
    # Language-specific checks
    if target_lang_code == "TH":
        # Thai should contain Thai characters
        if not re.search(r'[\u0e00-\u0e7f]', text):
            return False
    elif target_lang_code == "VI":
        # Vietnamese should contain Vietnamese diacritical marks
        if not re.search(r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]', text, re.IGNORECASE):
            return False
    
    return True


def main():
    print("=" * 60)
    print("CDrama Database v12.0 - Phase 3: DeepL Translation")
    print("=" * 60)
    
    # Check API usage
    used, limit = check_deepl_usage()
    print(f"DeepL usage: {used:,} / {limit:,} characters")
    remaining = limit - used
    print(f"Remaining: {remaining:,} characters")
    
    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=DELETE")
    
    # Find dramas that need translation
    cursor = conn.cursor()
    cursor.execute("SELECT id, slug, synopses_json FROM dramas")
    
    dramas_to_translate = []
    total_chars = 0
    
    for row in cursor.fetchall():
        drama_id, slug, synopses_str = row
        synopses = json.loads(synopses_str) if synopses_str else {}
        
        en_text = synopses.get("en", "")
        if not en_text or len(en_text) < 50:
            continue
        
        # Check which languages need translation
        needs_translation = []
        for lang in TARGET_LANGS:
            existing = synopses.get(lang["db_key"], "")
            if not existing or len(existing) < 50:
                needs_translation.append(lang)
        
        if needs_translation:
            dramas_to_translate.append({
                "id": drama_id,
                "slug": slug,
                "en_text": en_text,
                "synopses": synopses,
                "needs": needs_translation,
            })
            total_chars += len(en_text) * len(needs_translation)
    
    print(f"\nDramas needing translation: {len(dramas_to_translate)}")
    print(f"Estimated characters: {total_chars:,}")
    
    if total_chars > remaining:
        print(f"[ERROR] Not enough DeepL quota! Need {total_chars:,} but only {remaining:,} remaining.")
        sys.exit(1)
    
    if not dramas_to_translate:
        print("Nothing to translate!")
        conn.close()
        return
    
    # Translate in batches per language
    total_translated = 0
    total_failed = 0
    
    for lang in TARGET_LANGS:
        lang_code = lang["code"]
        db_key = lang["db_key"]
        lang_name = lang["name"]
        
        # Filter dramas that need this language
        dramas_for_lang = [d for d in dramas_to_translate if any(n["db_key"] == db_key for n in d["needs"])]
        
        if not dramas_for_lang:
            print(f"\n[{lang_name}] All translations already present, skipping.")
            continue
        
        print(f"\n--- Translating to {lang_name} ({lang_code}) ---")
        print(f"  Dramas: {len(dramas_for_lang)}")
        
        # Process in batches
        for batch_start in range(0, len(dramas_for_lang), BATCH_SIZE):
            batch = dramas_for_lang[batch_start:batch_start + BATCH_SIZE]
            texts = [d["en_text"] for d in batch]
            
            print(f"  Batch {batch_start//BATCH_SIZE + 1}: {len(batch)} texts ({sum(len(t) for t in texts):,} chars)")
            
            translations = translate_texts(texts, lang_code)
            
            for i, drama in enumerate(batch):
                if i < len(translations) and translations[i]:
                    translation = translations[i]
                    if validate_translation(translation, lang_code):
                        drama["synopses"][db_key] = translation
                        total_translated += 1
                    else:
                        print(f"    [WARN] Invalid translation for '{drama['slug']}', keeping empty")
                        total_failed += 1
                else:
                    total_failed += 1
            
            # Rate limiting
            time.sleep(0.5)
        
        # Update DB for this language
        for drama in dramas_for_lang:
            conn.execute(
                "UPDATE dramas SET synopses_json = ?, updated_at = ? WHERE id = ?",
                (json.dumps(drama["synopses"], ensure_ascii=False), 
                 time.strftime("%Y-%m-%d %H:%M:%S"),
                 drama["id"])
            )
        conn.commit()
    
    # Final usage check
    used_after, _ = check_deepl_usage()
    
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Translated: {total_translated}")
    print(f"  Failed: {total_failed}")
    print(f"  DeepL usage: {used:,} -> {used_after:,} (+{used_after - used:,} chars)")
    print(f"{'=' * 60}")
    
    conn.close()

if __name__ == "__main__":
    main()
