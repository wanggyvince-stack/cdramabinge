#!/usr/bin/env node
/**
 * Update poster_url in cdrama.db with real TMDB images
 * 
 * Usage: node scripts/update_posters.js
 * Requires: TMDB_API_KEY env var (or uses hardcoded key)
 */

const path = require('path');
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '9a7c89408067f29c28c54ec4438ebd17';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function searchTMDB(title) {
  const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Find the best match - prefer exact title match
      const exactMatch = data.results.find(r => 
        r.name?.toLowerCase() === title.toLowerCase() ||
        r.original_name?.toLowerCase() === title.toLowerCase()
      );
      
      const result = exactMatch || data.results[0];
      if (result.poster_path) {
        return `https://image.tmdb.org/t/p/w500${result.poster_path}`;
      }
    }
  } catch (err) {
    console.error(`  Error searching "${title}":`, err.message);
  }
  return null;
}

async function main() {
  // Dynamic import for ESM module
  const { createClient } = await import('@libsql/client');
  
  const dbPath = `file:${path.resolve(__dirname, '..', 'data', 'cdrama.db')}`;
  const client = createClient({ url: dbPath });
  
  // Get all dramas with placeholder posters
  const result = await client.execute("SELECT slug, titles_json, original_title FROM dramas WHERE poster_url LIKE '%placeholder%'");
  
  console.log(`Found ${result.rows.length} dramas with placeholder posters\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const row of result.rows) {
    const slug = row[0];
    const titlesJson = row[1];
    const originalTitle = row[2];
    
    // Parse titles JSON to get English title
    let enTitle = originalTitle;
    try {
      const titles = JSON.parse(titlesJson);
      if (titles.en) enTitle = titles.en;
    } catch (e) {}
    
    process.stdout.write(`Searching: ${enTitle} (${slug})... `);
    
    const posterUrl = await searchTMDB(enTitle);
    
    if (posterUrl) {
      console.log(`✓ ${posterUrl}`);
      await client.execute({
        sql: 'UPDATE dramas SET poster_url = ? WHERE slug = ?',
        args: [posterUrl, slug]
      });
      updated++;
    } else {
      console.log('✗ Not found');
      failed++;
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\nDone! Updated: ${updated}, Failed: ${failed}`);
  client.close();
}

main().catch(console.error);
