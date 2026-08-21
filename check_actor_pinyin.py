#!/usr/bin/env python3
"""
Check all actors for pinyin name errors.
Compare names_json.en with pypinyin conversion of names_json.zh.
"""

import json
import sqlite3
from pypinyin import pinyin, Style

def chinese_to_pinyin(chinese_name):
    """Convert Chinese name to pinyin (with proper capitalization)."""
    if not chinese_name:
        return ""
    
    # Get pinyin with tone numbers, then remove tones
    py_list = pinyin(chinese_name, style=Style.NORMAL)
    # Join syllables and capitalize each word
    pinyin_str = ' '.join([item[0] for item in py_list])
    # Capitalize first letter of each word
    return ' '.join(word.capitalize() for word in pinyin_str.split())

def check_actors():
    conn = sqlite3.connect('data/cdrama.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT slug, name, names_json FROM actors")
    actors = cursor.fetchall()
    
    errors = []
    warnings = []
    
    for actor in actors:
        slug = actor['slug']
        name = actor['name']
        
        try:
            names = json.loads(actor['names_json']) if actor['names_json'] else {}
        except json.JSONDecodeError:
            errors.append({
                'slug': slug,
                'name': name,
                'issue': 'Invalid JSON in names_json',
                'names_json': actor['names_json']
            })
            continue
        
        zh_name = names.get('zh', '')
        en_name = names.get('en', '')
        
        if not zh_name:
            warnings.append({
                'slug': slug,
                'name': name,
                'issue': 'No Chinese name (names_json.zh)',
                'en_name': en_name
            })
            continue
        
        # Check if slug is Chinese characters
        if any('\u4e00' <= c <= '\u9fff' for c in slug):
            errors.append({
                'slug': slug,
                'name': name,
                'issue': 'Slug contains Chinese characters',
                'zh_name': zh_name,
                'suggested_slug': chinese_to_pinyin(zh_name).lower().replace(' ', '-')
            })
            continue
        
        # Generate expected pinyin from Chinese name
        expected_en = chinese_to_pinyin(zh_name)
        
        # Compare with actual en_name
        if en_name and en_name != expected_en:
            # Check if it's a known exception (non-pinyin names)
            known_exceptions = [
                'Dilraba',  # 迪丽热巴 - Uyghur name
                'Sean Xiao',  # 肖战 - English name
            ]
            
            if en_name in known_exceptions:
                continue
            
            # Check if it's just a capitalization or spacing difference
            if en_name.lower().replace(' ', '') == expected_en.lower().replace(' ', ''):
                continue
            
            errors.append({
                'slug': slug,
                'name': name,
                'zh_name': zh_name,
                'current_en': en_name,
                'expected_en': expected_en,
                'slug_needs_fix': slug != expected_en.lower().replace(' ', '-')
            })
    
    conn.close()
    
    print(f"=== Check Results ===")
    print(f"Total actors: {len(actors)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    print()
    
    if errors:
        print("=== ERRORS (Name/Pinyin Mismatch) ===")
        for e in errors:
            print(f"Slug: {e['slug']}")
            print(f"  Chinese: {e.get('zh_name', 'N/A')}")
            print(f"  Current EN: {e.get('current_en', e.get('name', 'N/A'))}")
            if 'expected_en' in e:
                print(f"  Expected EN: {e['expected_en']}")
            if 'issue' in e:
                print(f"  Issue: {e['issue']}")
            if 'suggested_slug' in e:
                print(f"  Suggested slug: {e['suggested_slug']}")
            print()
    
    if warnings:
        print("=== WARNINGS ===")
        for w in warnings:
            print(f"Slug: {w['slug']} - {w['issue']}")
        print()

if __name__ == '__main__':
    check_actors()
