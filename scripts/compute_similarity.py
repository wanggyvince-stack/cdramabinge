#!/usr/bin/env python3
"""
compute_similarity.py — Compute cosine similarity between drama embeddings
For each drama, find Top 20 most similar dramas and write to similar_dramas_json.
"""

import os
import sys
import json
import sqlite3
import logging
import numpy as np
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'data'
DB_PATH = DATA_DIR / 'cdrama.db'
EMBEDDINGS_DIR = DATA_DIR / 'embeddings'
TOP_K = 20


def load_embeddings() -> tuple:
    """Load embeddings from disk or database."""
    emb_path = EMBEDDINGS_DIR / 'drama_embeddings.npy'
    ids_path = EMBEDDINGS_DIR / 'drama_ids.npy'
    
    if emb_path.exists() and ids_path.exists():
        logger.info("Loading embeddings from disk...")
        embeddings = np.load(str(emb_path))
        drama_ids = np.load(str(ids_path))
        return embeddings, drama_ids
    
    # Fall back to database
    logger.info("Loading embeddings from database...")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    cursor = conn.execute("""
        SELECT id, embedding_json FROM dramas 
        WHERE embedding_json IS NOT NULL
    """)
    
    drama_ids = []
    embeddings_list = []
    
    for row in cursor:
        try:
            embedding = json.loads(row['embedding_json'])
            drama_ids.append(row['id'])
            embeddings_list.append(embedding)
        except (json.JSONDecodeError, TypeError):
            continue
    
    conn.close()
    
    if not embeddings_list:
        logger.error("No embeddings found. Run generate_embeddings.py first.")
        sys.exit(1)
    
    embeddings = np.array(embeddings_list)
    drama_ids = np.array(drama_ids)
    
    # Save to disk for faster future loading
    np.save(str(emb_path), embeddings)
    np.save(str(ids_path), drama_ids)
    
    return embeddings, drama_ids


def cosine_similarity_matrix(embeddings: np.ndarray) -> np.ndarray:
    """Compute cosine similarity matrix. If embeddings are normalized, dot product = cosine sim."""
    # Assuming embeddings are already normalized
    return np.dot(embeddings, embeddings.T)


def compute_similarities():
    """Compute similarities and update database."""
    embeddings, drama_ids = load_embeddings()
    
    logger.info(f"Computing similarity for {len(drama_ids)} dramas...")
    logger.info(f"Embedding shape: {embeddings.shape}")
    
    # Compute full similarity matrix
    sim_matrix = cosine_similarity_matrix(embeddings)
    
    # For each drama, get top K most similar (excluding self)
    id_to_idx = {did: idx for idx, did in enumerate(drama_ids)}
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    # Get drama slugs for reference
    cursor = conn.execute("SELECT id, slug, original_title FROM dramas")
    drama_info = {}
    for row in cursor:
        drama_info[row['id']] = {
            'slug': row['slug'],
            'title': row['original_title'],
        }
    
    updated = 0
    for i, drama_id in enumerate(drama_ids):
        similarities = sim_matrix[i]
        
        # Get top K+1 (including self) and remove self
        top_indices = np.argsort(similarities)[::-1][:TOP_K + 1]
        
        similar_list = []
        for idx in top_indices:
            similar_id = int(drama_ids[idx])
            if similar_id == drama_id:
                continue  # Skip self
            
            info = drama_info.get(similar_id, {})
            similar_list.append({
                'id': similar_id,
                'slug': info.get('slug', ''),
                'title': info.get('title', ''),
                'score': round(float(similarities[idx]), 4),
            })
            
            if len(similar_list) >= TOP_K:
                break
        
        # Update database
        conn.execute("""
            UPDATE dramas SET similar_dramas_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(similar_list), int(drama_id)))
        updated += 1
    
    conn.commit()
    conn.close()
    
    logger.info(f"Updated {updated} dramas with similarity data")
    
    # Log sample results for quality check
    log_sample_results(conn, drama_ids, sim_matrix, drama_info)


def log_sample_results(conn, drama_ids, sim_matrix, drama_info):
    """Log sample similarity results for quality verification."""
    logger.info("")
    logger.info("=" * 60)
    logger.info("SAMPLE SIMILARITY RESULTS (Quality Check)")
    logger.info("=" * 60)
    
    # Pick 5 dramas to show
    sample_count = min(5, len(drama_ids))
    for i in range(sample_count):
        drama_id = int(drama_ids[i])
        info = drama_info.get(drama_id, {})
        logger.info(f"\n{info.get('title', 'Unknown')} (id={drama_id}):")
        
        similarities = sim_matrix[i]
        top_indices = np.argsort(similarities)[::-1][1:6]  # Top 5 similar
        
        for idx in top_indices:
            similar_id = int(drama_ids[idx])
            similar_info = drama_info.get(similar_id, {})
            score = similarities[idx]
            logger.info(f"  → {similar_info.get('title', 'Unknown')}: {score:.4f}")


def main():
    logger.info("=" * 60)
    logger.info("CDrama Database - Similarity Computation")
    logger.info("=" * 60)
    
    if not DB_PATH.exists():
        logger.error(f"Database not found at {DB_PATH}. Run import_kaggle.py first.")
        sys.exit(1)
    
    compute_similarities()
    logger.info("")
    logger.info("Similarity computation complete!")


if __name__ == '__main__':
    main()
