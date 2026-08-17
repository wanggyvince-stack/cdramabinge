/**
 * Populate actors table from TMDB credits API
 * Run: node scripts/populate-actors.mjs
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = `file:${path.resolve(__dirname, '..', 'data', 'cdrama.db')}`;

const TMDB_API_KEY = '9a7c89408067f29c28c54ec4438ebd17';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// 15 dramas with their TMDB IDs
const DRAMAS = [
  { slug: 'the-untamed', tmdbId: 90761 },
  { slug: 'word-of-honor', tmdbId: 119362 },
  { slug: 'nirvana-in-fire', tmdbId: 64197 },
  { slug: 'love-between-fairy-and-devil', tmdbId: 130368 },
  { slug: 'hidden-love', tmdbId: 210733 },
  { slug: 'story-of-minglan', tmdbId: 81502 },
  { slug: 'ashes-of-love', tmdbId: 80884 },
  { slug: 'the-longest-promise', tmdbId: 130270 },
  { slug: 'reset', tmdbId: 155441 },
  { slug: 'the-knockout', tmdbId: 210757 },
  { slug: 'meet-yourself', tmdbId: 216424 },
  { slug: 'love-like-the-galaxy', tmdbId: 137870 },
  { slug: 'joy-of-life', tmdbId: 95842 },
  { slug: 'a-little-reunion', tmdbId: 93088 },
  { slug: 'story-of-kunning', tmdbId: 207197 },
];

// Simple slug generator for actor names
function generateActorSlug(name, existingSlugs) {
  // For Chinese names, we generate a pinyin-like slug
  // For English names, lowercase + hyphen
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // If the base slug is empty or just numbers, use 'actor-' prefix
  if (!base || /^\d+$/.test(base)) {
    base = `actor-${name.charCodeAt(0)}-${name.charCodeAt(1) || 0}`;
  }

  // Ensure uniqueness
  let slug = base;
  let counter = 1;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// Check if a name contains Chinese characters
function hasChinese(str) {
  return /[\u4e00-\u9fff]/.test(str);
}

// Simple Chinese character to approximate romanization using character code mapping
// This is a basic approach - we use the TMDB name as-is if it's already English
function nameToSlug(name) {
  if (!hasChinese(name)) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  // For Chinese names, use a deterministic hash-based approach
  // Convert each character to a hex code
  const hex = Array.from(name)
    .filter(c => /[\u4e00-\u9fff]/.test(c))
    .map(c => c.charCodeAt(0).toString(36))
    .join('');
  return `actor-${hex}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🎬 Starting TMDB actor population...\n');

  const client = createClient({ url: DB_PATH });
  client.execute('PRAGMA journal_mode=MEMORY');

  // Track existing actor slugs to handle deduplication
  const existingSlugs = new Set();

  // Load existing actors
  const existingActors = await client.execute('SELECT slug, name, dramas_json FROM actors');
  for (const row of existingActors.rows) {
    existingSlugs.add(row.slug);
  }
  console.log(`Found ${existingActors.rows.length} existing actors in DB\n`);

  // Build a map of actor name -> slug for deduplication across dramas
  const actorNameToSlug = new Map();
  for (const row of existingActors.rows) {
    actorNameToSlug.set(row.name, row.slug);
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  for (const drama of DRAMAS) {
    console.log(`\n📺 Processing: ${drama.slug} (TMDB ID: ${drama.tmdbId})`);

    try {
      const url = `${TMDB_BASE}/tv/${drama.tmdbId}/credits?language=zh-CN&api_key=${TMDB_API_KEY}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.log(`  ⚠️  API returned ${res.status} for ${drama.slug}, skipping`);
        totalFailed++;
        await sleep(250);
        continue;
      }

      const data = await res.json();
      const cast = data.cast || [];

      if (cast.length === 0) {
        console.log(`  ⚠️  No cast data for ${drama.slug}`);
        await sleep(250);
        continue;
      }

      // Take top 8 actors (order < 8)
      const topCast = cast.filter(c => c.order < 8).slice(0, 8);
      console.log(`  Found ${topCast.length} main cast members`);

      for (const member of topCast) {
        const actorName = member.name || 'Unknown';
        const character = member.character || '';
        const profilePath = member.profile_path;
        const photoUrl = profilePath ? `https://image.tmdb.org/t/p/w185${profilePath}` : null;

        // Check if we already have this actor (by name)
        let actorSlug = actorNameToSlug.get(actorName);

        if (actorSlug) {
          // Actor exists, update dramas_json to include this drama
          try {
            const actorRow = await client.execute({
              sql: 'SELECT dramas_json FROM actors WHERE slug = ?',
              args: [actorSlug],
            });
            const currentDramasJson = actorRow.rows[0]?.dramas_json || '[]';
            let currentDramas = [];
            try {
              currentDramas = JSON.parse(currentDramasJson);
            } catch {
              currentDramas = [];
            }
            if (!currentDramas.includes(drama.slug)) {
              currentDramas.push(drama.slug);
              await client.execute({
                sql: 'UPDATE actors SET dramas_json = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?',
                args: [JSON.stringify(currentDramas), actorSlug],
              });
              console.log(`  ✓ Updated "${actorName}" - added ${drama.slug} to dramas`);
              totalUpdated++;
            } else {
              console.log(`  → "${actorName}" already linked to ${drama.slug}`);
            }
          } catch (e) {
            console.log(`  ⚠️  Error updating "${actorName}": ${e.message}`);
          }
        } else {
          // New actor - insert
          const isChinese = hasChinese(actorName);
          const namesJson = JSON.stringify(
            isChinese
              ? { en: '', zh: actorName }
              : { en: actorName, zh: '' }
          );
          const bioJson = JSON.stringify({ en: '', zh: '', vi: '', th: '' });
          const dramasJson = JSON.stringify([drama.slug]);
          const collaborationsJson = '[]';

          // Generate a unique slug
          actorSlug = generateActorSlug(actorName, existingSlugs);
          existingSlugs.add(actorSlug);
          actorNameToSlug.set(actorName, actorSlug);

          try {
            await client.execute({
              sql: `INSERT INTO actors (slug, name, names_json, photo_url, bio_json, dramas_json, collaborations_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              args: [actorSlug, actorName, namesJson, photoUrl, bioJson, dramasJson, collaborationsJson],
            });
            console.log(`  ✓ Inserted "${actorName}" (${photoUrl ? '📷' : 'no-photo'}) as ${character || 'unknown role'}`);
            totalInserted++;
          } catch (e) {
            console.log(`  ⚠️  Error inserting "${actorName}": ${e.message}`);
          }
        }
      }

      // Rate limit protection
      await sleep(250);
    } catch (e) {
      console.log(`  ❌ Failed to fetch credits for ${drama.slug}: ${e.message}`);
      totalFailed++;
    }
  }

  // Final count
  const finalCount = await client.execute('SELECT COUNT(*) as cnt FROM actors');
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Done!`);
  console.log(`   Inserted: ${totalInserted} new actors`);
  console.log(`   Updated:  ${totalUpdated} actor-drama links`);
  console.log(`   Failed:   ${totalFailed} dramas`);
  console.log(`   Total actors in DB: ${finalCount.rows[0].cnt}`);

  // Print sample records
  console.log(`\n📋 Sample records:`);
  const samples = await client.execute('SELECT slug, name, photo_url, dramas_json FROM actors LIMIT 5');
  for (const row of samples.rows) {
    console.log(`   ${row.name} (${row.slug}) - dramas: ${row.dramas_json}`);
  }

  client.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
