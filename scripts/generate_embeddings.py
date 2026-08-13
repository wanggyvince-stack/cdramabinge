#!/usr/bin/env python3
"""
generate_embeddings.py — AI Recommendation Engine
Uses sentence-transformers (all-mpnet-base-v2) to generate 768-dim embeddings
for each drama based on: title + synopsis + genres + tags
"""

import os
import sys
import json
import sqlite3
import logging
import numpy as np
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
DB_PATH = DATA_DIR / 'cdrama.db'
EMBEDDINGS_DIR = DATA_DIR / 'embeddings'
EMBEDDINGS_DIR.mkdir(exist_ok=True)


def get_model():
    """Load sentence-transformers model."""
    try:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers model (all-mpnet-base-v2)...")
        model = SentenceTransformer('all-mpnet-base-v2')
        logger.info(f"Model loaded. Embedding dimension: {model.get_sentence_embedding_dimension()}")
        return model
    except ImportError:
        raise RuntimeError("sentence-transformers not installed. Install with: pip install sentence-transformers")
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {e}")


def build_drama_text(drama: dict) -> str:
    """Build a text representation of a drama for embedding."""
    parts = []
    
    # Title
    title = drama.get('original_title', '')
    if title:
        parts.append(title)
    
    # English title
    try:
        titles = json.loads(drama.get('titles_json', '{}'))
        en_title = titles.get('en', '')
        if en_title and en_title != title:
            parts.append(en_title)
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Synopsis
    try:
        synopses = json.loads(drama.get('synopses_json', '{}'))
        synopsis = synopses.get('en', '')
        if synopsis:
            parts.append(synopsis[:500])  # Limit synopsis length
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Genres
    try:
        genres = json.loads(drama.get('genres', '[]'))
        if genres:
            parts.append(f"Genres: {', '.join(genres)}")
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Tags
    try:
        tags = json.loads(drama.get('tags', '[]'))
        if tags:
            parts.append(f"Tags: {', '.join(tags)}")
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Mood tags
    try:
        moods = json.loads(drama.get('mood_tags', '[]'))
        if moods:
            parts.append(f"Mood: {', '.join(moods)}")
    except (json.JSONDecodeError, TypeError):
        pass
    
    return ' '.join(parts)


def generate_embeddings_with_model(model):
    """Generate embeddings using the real sentence-transformers model."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    cursor = conn.execute("""
        SELECT id, original_title, titles_json, synopses_json, 
               genres, tags, mood_tags
        FROM dramas
        WHERE embedding_json IS NULL
        ORDER BY rating DESC
    """)
    dramas = cursor.fetchall()
    
    if not dramas:
        logger.info("No dramas need embeddings.")
        conn.close()
        return
    
    logger.info(f"Generating embeddings for {len(dramas)} dramas...")
    
    # Build text representations
    texts = []
    drama_ids = []
    for drama in dramas:
        text = build_drama_text(dict(drama))
        texts.append(text)
        drama_ids.append(drama['id'])
    
    # Generate embeddings in batches
    batch_size = 32
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        logger.info(f"  Encoding batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}...")
        embeddings = model.encode(batch, show_progress_bar=False, normalize_embeddings=True)
        all_embeddings.append(embeddings)
    
    # Concatenate all embeddings
    embeddings_matrix = np.vstack(all_embeddings)
    logger.info(f"Generated {embeddings_matrix.shape[0]} embeddings of dimension {embeddings_matrix.shape[1]}")
    
    # Save embeddings matrix
    np.save(str(EMBEDDINGS_DIR / 'drama_embeddings.npy'), embeddings_matrix)
    np.save(str(EMBEDDINGS_DIR / 'drama_ids.npy'), np.array(drama_ids))
    
    # Store in database as JSON
    for idx, drama_id in enumerate(drama_ids):
        embedding_list = embeddings_matrix[idx].tolist()
        conn.execute("""
            UPDATE dramas SET embedding_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(embedding_list), drama_id))
    
    conn.commit()
    conn.close()
    logger.info("Embeddings saved to database and disk.")


def generate_embeddings_mock():
    """Generate mock embeddings for development when sentence-transformers is unavailable."""
    logger.info("Using mock embeddings (sentence-transformers not available)...")
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    cursor = conn.execute("""
        SELECT id, original_title, genres, tags, mood_tags
        FROM dramas
        WHERE embedding_json IS NULL
    """)
    dramas = cursor.fetchall()
    
    if not dramas:
        logger.info("No dramas need embeddings.")
        conn.close()
        return
    
    DIM = 768
    drama_ids = []
    embeddings = []
    
    for row in dramas:
        drama_id = row['id']
        genres_str = row['genres'] or '' if row['genres'] else ''
        tags_str = row['tags'] or '' if row['tags'] else ''
        
        # Create deterministic mock embeddings based on genres/tags
        np.random.seed(drama_id)
        embedding = np.random.randn(DIM).astype(np.float32)
        embedding = embedding / np.linalg.norm(embedding)  # Normalize
        
        # Add genre-specific bias to create clusters
        genres_lower = genres_str.lower()
        if 'romance' in genres_lower or 'romantic' in genres_lower:
            embedding[:50] += 0.3
        if 'fantasy' in genres_lower or 'xianxia' in genres_lower:
            embedding[50:100] += 0.3
        if 'thriller' in genres_lower or 'mystery' in genres_lower:
            embedding[100:150] += 0.3
        if 'historical' in genres_lower:
            embedding[150:200] += 0.3
        if 'comedy' in genres_lower:
            embedding[200:250] += 0.3
        
        # Re-normalize
        embedding = embedding / np.linalg.norm(embedding)
        
        embeddings.append(embedding)
        drama_ids.append(drama_id)
        
        # Save to DB
        conn.execute("""
            UPDATE dramas SET embedding_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(embedding.tolist()), drama_id))
    
    embeddings_matrix = np.array(embeddings)
    np.save(str(EMBEDDINGS_DIR / 'drama_embeddings.npy'), embeddings_matrix)
    np.save(str(EMBEDDINGS_DIR / 'drama_ids.npy'), np.array(drama_ids))
    
    conn.commit()
    conn.close()
    logger.info(f"Mock embeddings generated for {len(dramas)} dramas (dim={DIM})")


def main():
    logger.info("=" * 60)
    logger.info("CDrama Database - Embedding Generation")
    logger.info("=" * 60)
    
    if not DB_PATH.exists():
        logger.error(f"Database not found at {DB_PATH}. Run import_kaggle.py first.")
        sys.exit(1)
    
    # Try to use real model, fall back to mock
    try:
        model = get_model()
        generate_embeddings_with_model(model)
    except Exception as e:
        logger.warning(f"Could not use sentence-transformers: {e}")
        logger.info("Falling back to mock embeddings...")
        generate_embeddings_mock()
    
    logger.info("Embedding generation complete!")


if __name__ == '__main__':
    main()
