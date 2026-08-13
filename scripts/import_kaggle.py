#!/usr/bin/env python3
"""
import_kaggle.py — Import Kaggle Asian Drama Dataset
Downloads and imports C-drama data from Kaggle into local SQLite.

Dataset: https://www.kaggle.com/datasets/lakhindarpal/asian-drama-dataset
"""

import os
import sys
import json
import sqlite3
import logging
import re
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
DB_PATH = DATA_DIR / 'cdrama.db'

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)


def init_db(db_path: Path) -> sqlite3.Connection:
    """Initialize database with schema."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS dramas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            tmdb_id INTEGER,
            mdl_id INTEGER,
            original_title TEXT NOT NULL,
            original_language TEXT,
            titles_json TEXT,
            synopses_json TEXT,
            genres TEXT,
            tags TEXT,
            mood_tags TEXT,
            rating REAL,
            year INTEGER,
            episodes INTEGER,
            status TEXT,
            poster_url TEXT,
            backdrop_url TEXT,
            similar_dramas_json TEXT,
            streaming_json TEXT,
            embedding_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS actors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            names_json TEXT,
            photo_url TEXT,
            bio_json TEXT,
            dramas_json TEXT,
            collaborations_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS virus_quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            title_json TEXT,
            description_json TEXT,
            questions_json TEXT,
            results_json TEXT,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS editorial_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_type TEXT NOT NULL,
            drama_id INTEGER,
            position INTEGER NOT NULL,
            title_override_json TEXT,
            comment_json TEXT,
            badge_text TEXT,
            active INTEGER DEFAULT 1,
            start_date TEXT,
            end_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_dramas_slug ON dramas(slug);
        CREATE INDEX IF NOT EXISTS idx_dramas_tmdb ON dramas(tmdb_id);
        CREATE INDEX IF NOT EXISTS idx_dramas_year ON dramas(year);
        CREATE INDEX IF NOT EXISTS idx_dramas_rating ON dramas(rating);
    """)
    
    conn.commit()
    logger.info(f"Database initialized at {db_path}")
    return conn


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:100]


def download_kaggle_dataset() -> Path:
    """Download the Kaggle Asian Drama Dataset."""
    try:
        import kaggle
    except ImportError:
        logger.error("kaggle package not installed. Install with: pip install kaggle")
        logger.info("Also ensure you have ~/.kaggle/kaggle.json credentials configured.")
        sys.exit(1)
    
    output_dir = DATA_DIR / 'kaggle_raw'
    output_dir.mkdir(exist_ok=True)
    
    logger.info("Downloading Kaggle Asian Drama Dataset...")
    try:
        kaggle.api.dataset_download_files(
            'lakhindarpal/asian-drama-dataset',
            path=str(output_dir),
            unzip=True
        )
        logger.info("Download complete.")
    except Exception as e:
        logger.error(f"Failed to download dataset: {e}")
        logger.info("Please download manually from: https://www.kaggle.com/datasets/lakhindarpal/asian-drama-dataset")
        sys.exit(1)
    
    return output_dir


def find_csv_files(download_dir: Path) -> dict:
    """Find CSV files in the downloaded dataset."""
    csv_files = list(download_dir.glob('*.csv'))
    if not csv_files:
        logger.error("No CSV files found in downloaded dataset.")
        sys.exit(1)
    
    logger.info(f"Found CSV files: {[f.name for f in csv_files]}")
    return {f.stem: f for f in csv_files}


def import_to_db(conn: sqlite3.Connection, csv_files: dict) -> int:
    """Import C-drama data into the database."""
    try:
        import pandas as pd
    except ImportError:
        logger.error("pandas not installed. Install with: pip install pandas")
        sys.exit(1)
    
    imported = 0
    skipped = 0
    
    for name, filepath in csv_files.items():
        logger.info(f"Processing {filepath.name}...")
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            logger.error(f"Error reading {filepath.name}: {e}")
            continue
        
        logger.info(f"  Columns: {list(df.columns)}")
        logger.info(f"  Rows: {len(df)}")
        
        # Detect columns (flexible column mapping)
        col_map = detect_columns(df.columns.tolist())
        
        for _, row in df.iterrows():
            try:
                # Filter for Chinese-language dramas
                language = str(row.get(col_map.get('language', ''), '')).lower()
                country = str(row.get(col_map.get('country', ''), '')).lower()
                
                is_chinese = (
                    'chinese' in language or 
                    'zh' in language or 
                    'mandarin' in language or
                    'china' in country or
                    'cn' in country
                )
                
                if not is_chinese:
                    skipped += 1
                    continue
                
                # Extract fields
                title = str(row.get(col_map.get('title', ''), 'Unknown')).strip()
                if title == 'Unknown' or title == 'nan':
                    continue
                
                slug = slugify(title)
                year = None
                if col_map.get('year'):
                    try:
                        year = int(float(row[col_map['year']]))
                    except (ValueError, TypeError):
                        pass
                
                rating = None
                if col_map.get('rating'):
                    try:
                        rating = float(row[col_map['rating']])
                    except (ValueError, TypeError):
                        pass
                
                episodes = None
                if col_map.get('episodes'):
                    try:
                        episodes = int(float(row[col_map['episodes']]))
                    except (ValueError, TypeError):
                        pass
                
                genres_list = []
                if col_map.get('genre'):
                    genre_str = str(row.get(col_map['genre'], ''))
                    if genre_str and genre_str != 'nan':
                        genres_list = [g.strip() for g in genre_str.split(',') if g.strip()]
                
                # Build titles JSON (English only from Kaggle)
                titles_json = json.dumps({"en": title})
                
                # Synopsis if available
                synopsis = ''
                if col_map.get('synopsis'):
                    synopsis = str(row.get(col_map['synopsis'], ''))
                    if synopsis == 'nan':
                        synopsis = ''
                synopses_json = json.dumps({"en": synopsis}) if synopsis else None
                
                conn.execute("""
                    INSERT OR IGNORE INTO dramas 
                    (slug, original_title, original_language, titles_json, synopses_json,
                     genres, rating, year, episodes, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    slug, title, 'zh', titles_json, synopses_json,
                    json.dumps(genres_list) if genres_list else None,
                    rating, year, episodes,
                    str(row.get(col_map.get('status', ''), '')).strip() if col_map.get('status') else None
                ))
                
                if conn.total_changes:
                    imported += 1
                    
            except Exception as e:
                logger.debug(f"Error importing row: {e}")
                continue
        
        conn.commit()
        logger.info(f"  Imported {imported} C-dramas, skipped {skipped} non-Chinese entries")
    
    return imported


def detect_columns(columns: list) -> dict:
    """Detect column mapping from DataFrame columns."""
    col_map = {}
    columns_lower = [c.lower() for c in columns]
    
    # Title
    for i, c in enumerate(columns_lower):
        if 'title' in c or 'name' in c:
            col_map['title'] = columns[i]
            break
    
    # Language
    for i, c in enumerate(columns_lower):
        if 'language' in c:
            col_map['language'] = columns[i]
            break
    
    # Country
    for i, c in enumerate(columns_lower):
        if 'country' in c or 'origin' in c:
            col_map['country'] = columns[i]
            break
    
    # Year
    for i, c in enumerate(columns_lower):
        if 'year' in c or 'aired' in c:
            col_map['year'] = columns[i]
            break
    
    # Rating
    for i, c in enumerate(columns_lower):
        if 'rating' in c or 'score' in c:
            col_map['rating'] = columns[i]
            break
    
    # Episodes
    for i, c in enumerate(columns_lower):
        if 'episode' in c:
            col_map['episodes'] = columns[i]
            break
    
    # Genre
    for i, c in enumerate(columns_lower):
        if 'genre' in c or 'type' in c:
            col_map['genre'] = columns[i]
            break
    
    # Synopsis
    for i, c in enumerate(columns_lower):
        if 'synopsis' in c or 'description' in c or 'summary' in c or 'plot' in c:
            col_map['synopsis'] = columns[i]
            break
    
    # Status
    for i, c in enumerate(columns_lower):
        if 'status' in c:
            col_map['status'] = columns[i]
            break
    
    logger.info(f"  Column mapping: {col_map}")
    return col_map


def create_sample_data(conn: sqlite3.Connection):
    """Create sample C-drama data for development/testing when Kaggle download fails."""
    logger.info("Creating sample data for development...")
    
    sample_dramas = [
        ("the-untamed", "The Untamed", "陈情令", 2019, 50, 8.5, 
         ["Fantasy", "Adventure", "Drama"], ["xianxia", "bromance", "cultivation"]),
        ("word-of-honor", "Word of Honor", "山河令", 2021, 36, 8.3,
         ["Wuxia", "Action", "Drama"], ["wuxia", "martial_arts", "friendship"]),
        ("nirvana-in-fire", "Nirvana in Fire", "琅琊榜", 2015, 54, 9.1,
         ["Historical", "Drama", "Mystery"], ["political", "revenge", "strategic"]),
        ("love-between-fairy-and-devil", "Love Between Fairy and Devil", "苍兰诀", 2022, 36, 8.0,
         ["Fantasy", "Romance"], ["xianxia", "romance", "comedy"]),
        ("hidden-love", "Hidden Love", "偷偷藏不住", 2023, 25, 8.2,
         ["Romance", "Drama"], ["sweet", "campus", "age_gap"]),
        ("story-of-minglan", "The Story of Minglan", "知否知否应是绿肥红瘦", 2018, 78, 8.8,
         ["Historical", "Romance", "Drama"], ["palace", "romance", "family"]),
        ("ashes-of-love", "Ashes of Love", "香蜜沉沉烬如霜", 2018, 63, 8.4,
         ["Fantasy", "Romance"], ["xianxia", "tragedy", "reincarnation"]),
        ("the-longest-promise", "The Longest Promise", "长月烬明", 2023, 40, 7.8,
         ["Fantasy", "Romance", "Drama"], ["xianxia", "time_travel", "reincarnation"]),
        ("reset", "Reset", "开端", 2022, 15, 8.5,
         ["Thriller", "Mystery", "Sci-Fi"], ["time_loop", "thriller", "suspense"]),
        ("the-knockout", "The Knockout", "狂飙", 2023, 39, 8.7,
         ["Crime", "Drama", "Thriller"], ["crime", "corruption", "epic"]),
        ("meet-yourself", "Meet Yourself", "去有风的地方", 2023, 40, 8.3,
         ["Romance", "Drama"], ["healing", "rural", "slice_of_life"]),
        ("love-like-the-galaxy", "Love Like the Galaxy", "星汉灿烂", 2022, 56, 8.1,
         ["Historical", "Romance"], ["palace", "romance", "coming_of_age"]),
        ("joy-of-life", "Joy of Life", "庆余年", 2019, 46, 8.6,
         ["Historical", "Fantasy", "Comedy"], ["time_travel", "political", "comedy"]),
        ("a-little-reunion", "A Little Reunion", "小欢喜", 2019, 49, 8.4,
         ["Drama", "Family"], ["family", "education", "emotional"]),
        ("story-of-kunning", "Story of Kunning Palace", "宁安如梦", 2023, 38, 7.9,
         ["Historical", "Romance", "Drama"], ["palace", "reincarnation", "romance"]),
        ("nid-of-a-thousand-songs", "Nid of a Thousand Songs", "一千个晚上", 2024, 24, 7.5,
         ["Thriller", "Supernatural"], ["supernatural", "horror", "mystery"]),
    ]
    
    for slug, title, original, year, episodes, rating, genres, tags in sample_dramas:
        titles_json = json.dumps({"en": title, "zh": original})
        synopses_json = json.dumps({"en": f"A captivating {genres[0].lower()} drama from {year}."})
        
        conn.execute("""
            INSERT OR IGNORE INTO dramas 
            (slug, original_title, original_language, titles_json, synopses_json,
             genres, tags, rating, year, episodes, status, mood_tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            slug, original, 'zh', titles_json, synopses_json,
            json.dumps(genres), json.dumps(tags), rating, year, episodes, 'Completed',
            json.dumps(assign_mood_tags(tags))
        ))
    
    conn.commit()
    logger.info(f"Created {len(sample_dramas)} sample dramas.")


def assign_mood_tags(tags: list) -> list:
    """Assign mood tags based on drama tags."""
    mood_map = {
        'tragedy': 'wanna_cry', 'emotional': 'wanna_cry', 'reincarnation': 'wanna_cry',
        'comedy': 'light_fun', 'sweet': 'light_fun', 'slice_of_life': 'light_fun',
        'thriller': 'intense', 'crime': 'intense', 'suspense': 'intense',
        'romance': 'romantic', 'sweet': 'romantic',
        'political': 'mindbending', 'strategic': 'mindbending', 'time_loop': 'mindbending',
        'horror': 'spooky', 'supernatural': 'spooky',
        'martial_arts': 'empowering', 'revenge': 'empowering',
        'healing': 'aesthetic', 'rural': 'aesthetic',
    }
    
    moods = set()
    for tag in tags:
        if tag in mood_map:
            moods.add(mood_map[tag])
    
    # Default moods
    if not moods:
        moods.add('romantic')
    
    return list(moods)[:3]


def main():
    logger.info("=" * 60)
    logger.info("CDrama Database - Kaggle Import")
    logger.info("=" * 60)
    
    conn = init_db(DB_PATH)
    
    # Try to download and import Kaggle data
    try:
        download_dir = download_kaggle_dataset()
        csv_files = find_csv_files(download_dir)
        count = import_to_db(conn, csv_files)
        logger.info(f"Successfully imported {count} C-dramas from Kaggle.")
    except (SystemExit, Exception) as e:
        logger.warning(f"Kaggle import failed: {e}")
        logger.info("Falling back to sample data...")
        create_sample_data(conn)
    
    # Print stats
    cursor = conn.execute("SELECT COUNT(*) FROM dramas")
    total = cursor.fetchone()[0]
    logger.info(f"Total dramas in database: {total}")
    
    conn.close()
    logger.info("Import complete!")


if __name__ == '__main__':
    main()
