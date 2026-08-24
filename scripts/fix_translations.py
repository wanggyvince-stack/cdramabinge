#!/usr/bin/env python3
"""
Fix P0: Translate 70 new dramas' vi/th/id synopses from English to real translations.
Uses deep-translator GoogleTranslator (free, no API key needed).
"""

import json
import sqlite3
import time
import sys
from deep_translator import GoogleTranslator

DB_PATH = "data/cdrama.db"
LANGUAGES = ["vi", "th", "id"]

def get_new_dramas():
    """Get all 70 new dramas (created after 2026-08-20) with their English synopsis."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT slug, synopses_json, original_title
        FROM dramas 
        WHERE created_at > '2026-08-20'
        ORDER BY slug
    """)
    
    dramas = []
    for row in cursor.fetchall():
        synopses = json.loads(row["synopses_json"])
        dramas.append({
            "slug": row["slug"],
            "original_title": row["original_title"],
            "synopses": synopses,
            "english": synopses.get("en", "")
        })
    
    conn.close()
    return dramas

def translate_text(text, target_lang, max_retries=3):
    """Translate text to target language using Google Translate."""
    if not text or len(text.strip()) < 10:
        return text
    
    # Google Translate has a 5000 char limit per request
    # Split long texts into chunks
    chunks = []
    while len(text) > 4500:
        # Find a good split point (sentence boundary)
        split_at = text.rfind('. ', 0, 4500)
        if split_at == -1:
            split_at = text.rfind(' ', 0, 4500)
        if split_at == -1:
            split_at = 4500
        chunks.append(text[:split_at + 1])
        text = text[split_at + 1:]
    chunks.append(text)
    
    translated_chunks = []
    translator = GoogleTranslator(source='en', target=target_lang)
    
    for chunk in chunks:
        for attempt in range(max_retries):
            try:
                result = translator.translate(chunk)
                translated_chunks.append(result)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    wait = (attempt + 1) * 2
                    print(f"    Retry {attempt+1} in {wait}s: {e}", file=sys.stderr)
                    time.sleep(wait)
                else:
                    print(f"    FAILED after {max_retries} attempts: {e}", file=sys.stderr)
                    translated_chunks.append(chunk)  # fallback to English
        
        # Rate limiting: small delay between chunks
        time.sleep(0.3)
    
    return ' '.join(translated_chunks)

def is_english_text(text):
    """Check if text is predominantly English (not translated)."""
    if not text:
        return True
    # Get text after the first period+space (skip language prefix)
    parts = text.split('. ', 1)
    body = parts[-1] if len(parts) > 1 else text
    # Count ASCII letters vs total
    alpha_chars = [c for c in body.replace(' ', '') if c.isalpha()]
    if not alpha_chars:
        return True
    ascii_ratio = sum(1 for c in alpha_chars if c.isascii()) / len(alpha_chars)
    return ascii_ratio > 0.7

def main():
    print("Loading new dramas...")
    dramas = get_new_dramas()
    print(f"Found {len(dramas)} new dramas")
    
    # Count how many need translation
    needs_translation = 0
    for d in dramas:
        for lang in LANGUAGES:
            text = d["synopses"].get(lang, "")
            if is_english_text(text):
                needs_translation += 1
    print(f"Translations needed: {needs_translation}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    translated_count = 0
    failed_dramas = []
    
    for i, drama in enumerate(dramas):
        slug = drama["slug"]
        synopses = drama["synopses"]
        english = drama["english"]
        
        updated = False
        
        for lang in LANGUAGES:
            current_text = synopses.get(lang, "")
            
            if not is_english_text(current_text):
                continue  # Already translated
            
            print(f"[{i+1}/{len(dramas)}] Translating {slug} -> {lang}...")
            
            translated = translate_text(english, lang)
            
            if translated and not is_english_text(translated):
                synopses[lang] = translated
                updated = True
                translated_count += 1
                print(f"  OK ({len(translated)} chars)")
            else:
                print(f"  WARN: Translation may still be English")
                failed_dramas.append((slug, lang))
            
            # Rate limiting between languages
            time.sleep(0.2)
        
        if updated:
            new_json = json.dumps(synopses, ensure_ascii=False)
            cursor.execute(
                "UPDATE dramas SET synopses_json = ? WHERE slug = ?",
                (new_json, slug)
            )
            conn.commit()
        
        # Small delay between dramas to avoid rate limiting
        time.sleep(0.5)
    
    conn.close()
    
    print(f"\n=== SUMMARY ===")
    print(f"Translated: {translated_count} texts")
    print(f"Dramas processed: {len(dramas)}")
    
    if failed_dramas:
        print(f"Failed translations: {len(failed_dramas)}")
        for slug, lang in failed_dramas[:10]:
            print(f"  {slug} ({lang})")
    
    print("Done!")

if __name__ == "__main__":
    main()
