/**
 * v9.1 Actor Enrichment — Bulk TMDB Person Data Import
 * 
 * Fetches biography, birthday, birthplace, photos, and full filmography
 * from TMDB Person API for all actors in the database.
 * 
 * Run: node scripts/enrich_actors_bulk.mjs
 * 
 * Matching strategy (3-layer fallback):
 *   Layer 1: Search TMDB by Chinese name (names_json.zh)
 *   Layer 2: Reverse-lookup from drama credits (known tmdb_id dramas)
 *   Layer 3: Search TMDB by English/display name
 * 
 * Rate limit: 250ms between requests (TMDB allows 40 req/10s)
 * Idempotent: skips actors with existing tmdb_person_id
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = `file:${path.resolve(__dirname, '..', 'data', 'cdrama.db')}`;

const TMDB_API_KEY = process.env.TMDB_API_KEY || '9a7c89408067f29c28c54ec4438ebd17';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const DELAY_MS = 300; // slightly above minimum to be safe
const TOP_FILMOGRAPHY = 30;
const TOP_PHOTOS = 6;

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });
  
  if (!res.ok) {
    throw new Error(`TMDB ${res.status} for ${endpoint}`);
  }
  
  await sleep(DELAY_MS);
  return res.json();
}

// ────────────────────────────────────────────
// Migration
// ────────────────────────────────────────────

async function runMigration(client) {
  const columns = [
    'tmdb_person_id INTEGER',
    'birthday TEXT',
    'deathday TEXT',
    'birthplace TEXT',
    'also_known_as TEXT',
    'gender INTEGER',
    'known_for_department TEXT',
    'photos_json TEXT',
    'full_filmography_json TEXT',
  ];
  
  console.log('Running migration (ALTER TABLE)...');
  for (const col of columns) {
    try {
      await client.execute(`ALTER TABLE actors ADD COLUMN ${col}`);
      console.log(`  + ${col}`);
    } catch (e) {
      // Column already exists — ignore
      if (e.message.includes('duplicate column')) {
        // silent
      } else {
        console.log(`  ? ${col} — ${e.message}`);
      }
    }
  }
  console.log('Migration done.\n');
}

// ────────────────────────────────────────────
// TMDB Person ID Matching
// ────────────────────────────────────────────

/**
 * Layer 1: Search TMDB person by Chinese name
 */
async function matchByChineseName(zhName) {
  if (!zhName) return null;
  
  try {
    const data = await tmdbFetch('/search/person', {
      query: zhName,
      language: 'zh-CN',
    });
    
    const results = data.results || [];
    if (results.length === 0) return null;
    
    // Find best match: prefer exact name match + Acting department
    const exact = results.find(r => 
      r.name === zhName || 
      (r.known_as && r.known_as.includes(zhName)) ||
      (r.also_known_as && r.also_known_as.includes(zhName))
    );
    
    if (exact && exact.known_for_department === 'Acting') {
      return exact.id;
    }
    
    // Fallback: first result with Acting department and some popularity
    const acting = results.find(r => 
      r.known_for_department === 'Acting' && r.popularity > 0
    );
    
    return acting ? acting.id : null;
  } catch (e) {
    console.log(`    [L1 error] ${zhName}: ${e.message}`);
    return null;
  }
}

/**
 * Layer 2: Reverse-lookup from drama credits
 */
async function matchFromDramaCredits(dramasJson, namesJson, client) {
  let dramasList;
  try {
    dramasList = JSON.parse(dramasJson || '[]');
  } catch {
    dramasList = [];
  }
  if (dramasList.length === 0) return null;
  
  const names = (() => {
    try { return JSON.parse(namesJson || '{}'); } catch { return {}; }
  })();
  const zhName = names.zh || '';
  const enName = names.en || '';
  
  // Get tmdb_ids for this actor's dramas
  const slugList = dramasList.map(d => typeof d === 'string' ? d : d.slug).filter(Boolean);
  
  for (const slug of slugList.slice(0, 5)) { // check at most 5 dramas
    try {
      const dramaRow = await client.execute({
        sql: 'SELECT tmdb_id FROM dramas WHERE slug = ?',
        args: [slug],
      });
      
      if (!dramaRow.rows.length || !dramaRow.rows[0].tmdb_id) continue;
      const tmdbId = dramaRow.rows[0].tmdb_id;
      
      const credits = await tmdbFetch(`/tv/${tmdbId}/credits`, { language: 'zh-CN' });
      const cast = credits.cast || [];
      
      // Try to match by Chinese name
      if (zhName) {
        const match = cast.find(c => c.name === zhName);
        if (match) return match.id;
      }
      
      // Try to match by English name
      if (enName) {
        const match = cast.find(c => 
          c.name === enName || 
          c.name.toLowerCase() === enName.toLowerCase()
        );
        if (match) return match.id;
      }
      
      // Try fuzzy: name contains or is contained
      for (const c of cast) {
        if (zhName && (c.name.includes(zhName) || zhName.includes(c.name))) {
          if (c.known_for_department === 'Acting') return c.id;
        }
      }
    } catch (e) {
      // Skip drama on error
      continue;
    }
  }
  
  return null;
}

/**
 * Layer 3: Search TMDB person by English/display name
 */
async function matchByEnglishName(name) {
  if (!name) return null;
  
  try {
    const data = await tmdbFetch('/search/person', {
      query: name,
    });
    
    const results = data.results || [];
    if (results.length === 0) return null;
    
    // Exact match preferred
    const exact = results.find(r => 
      r.name.toLowerCase() === name.toLowerCase()
    );
    if (exact && exact.known_for_department === 'Acting') {
      return exact.id;
    }
    
    // First Acting result with popularity
    const acting = results.find(r => 
      r.known_for_department === 'Acting' && r.popularity > 1
    );
    
    return acting ? acting.id : null;
  } catch (e) {
    console.log(`    [L3 error] ${name}: ${e.message}`);
    return null;
  }
}

// ────────────────────────────────────────────
// Fetch Person Details
// ────────────────────────────────────────────

async function fetchPersonDetails(personId) {
  return tmdbFetch(`/person/${personId}`, {
    append_to_response: 'external_ids,images',
    language: 'en-US',
  });
}

async function fetchTvCredits(personId) {
  const data = await tmdbFetch(`/person/${personId}/tv_credits`, {
    language: 'en-US',
  });
  return data.cast || [];
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────

async function main() {
  console.log('=== v9.1 Actor Enrichment ===\n');
  
  const client = createClient({ url: DB_PATH });
  
  // Step 0: Migration
  await runMigration(client);
  
  // Step 1: Load all actors
  const allActors = await client.execute('SELECT * FROM actors');
  console.log(`Total actors: ${allActors.rows.length}\n`);
  
  // Build set of our drama tmdb_ids for is_in_our_db flag
  const allDramas = await client.execute('SELECT tmdb_id, slug FROM dramas');
  const ourTmdbIds = new Set(allDramas.rows.filter(d => d.tmdb_id).map(d => d.tmdb_id));
  const tmdbIdToSlug = {};
  for (const d of allDramas.rows) {
    if (d.tmdb_id) tmdbIdToSlug[d.tmdb_id] = d.slug;
  }
  
  let matched = 0;
  let enriched = 0;
  let skipped = 0;
  let alreadyHadId = 0;
  const errors = [];
  const matchLayer = { L1: 0, L2: 0, L3: 0 };
  
  for (const actor of allActors.rows) {
    const actorId = actor.id;
    const slug = actor.slug;
    const name = actor.name;
    const namesJson = actor.names_json || '{}';
    const dramasJson = actor.dramas_json || '[]';
    
    let names;
    try { names = JSON.parse(namesJson); } catch { names = {}; }
    const zhName = names.zh || '';
    
    // Skip if already enriched
    if (actor.tmdb_person_id) {
      alreadyHadId++;
      continue;
    }
    
    process.stdout.write(`[${matched + enriched + skipped + 1}/${allActors.rows.length}] ${name} (${slug})...`);
    
    // ── Match TMDB Person ID ──
    let personId = null;
    let layer = '';
    
    // Layer 1: Chinese name search
    personId = await matchByChineseName(zhName);
    if (personId) { layer = 'L1'; matchLayer.L1++; }
    
    // Layer 2: Drama credits reverse lookup
    if (!personId) {
      personId = await matchFromDramaCredits(dramasJson, namesJson, client);
      if (personId) { layer = 'L2'; matchLayer.L2++; }
    }
    
    // Layer 3: English name search
    if (!personId) {
      personId = await matchByEnglishName(name);
      if (personId) { layer = 'L3'; matchLayer.L3++; }
    }
    
    if (!personId) {
      console.log(` NO MATCH`);
      skipped++;
      continue;
    }
    
    matched++;
    console.log(` matched ${personId} (${layer})`);
    
    // ── Fetch person details ──
    try {
      const person = await fetchPersonDetails(personId);
      
      // Extract photos
      const photos = (person.images?.profiles || [])
        .slice(0, TOP_PHOTOS)
        .map(p => `${TMDB_IMG}/w300${p.file_path}`);
      
      // Extract biography
      const biography = person.biography || '';
      
      // Update actor record
      const updates = {
        tmdb_person_id: personId,
        birthday: person.birthday || null,
        deathday: person.deathday || null,
        birthplace: person.place_of_birth || null,
        also_known_as: JSON.stringify(person.also_known_as || []),
        gender: person.gender || 0,
        known_for_department: person.known_for_department || null,
        photos_json: photos.length > 0 ? JSON.stringify(photos) : null,
      };
      
      // Merge biography into bio_json.en (only if currently empty)
      if (biography) {
        let bioJson;
        try { bioJson = JSON.parse(actor.bio_json || '{}'); } catch { bioJson = {}; }
        if (!bioJson.en || bioJson.en.trim() === '') {
          bioJson.en = biography;
          updates.bio_json = JSON.stringify(bioJson);
        }
      }
      
      // Build SET clause
      const setClauses = [];
      const setArgs = [];
      for (const [key, value] of Object.entries(updates)) {
        // Convert snake_case keys back to column names
        const colName = key;
        setClauses.push(`${colName} = ?`);
        setArgs.push(value);
      }
      if (updates.bio_json !== undefined) {
        // Already included in updates
      }
      
      // Handle bio_json separately if it was updated
      if (updates.bio_json === undefined) {
        await client.execute({
          sql: `UPDATE actors SET ${setClauses.join(', ')} WHERE id = ?`,
          args: [...setArgs, actorId],
        });
      } else {
        const bioJsonCol = 'bio_json = ?';
        await client.execute({
          sql: `UPDATE actors SET ${setClauses.join(', ')}, ${bioJsonCol} WHERE id = ?`,
          args: [...setArgs, updates.bio_json, actorId],
        });
      }
      
      // ── Fetch TV credits ──
      try {
        const credits = await fetchTvCredits(personId);
        
        // Sort by vote_count desc, take top 30
        const topCredits = credits
          .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
          .slice(0, TOP_FILMOGRAPHY)
          .map(c => ({
            id: c.id,
            name: c.name || '',
            character: c.character || '',
            episode_count: c.episode_count || 0,
            first_air_date: c.first_air_date || '',
            vote_average: c.vote_average || 0,
            poster_path: c.poster_path || '',
            is_in_our_db: ourTmdbIds.has(c.id),
            our_slug: ourTmdbIds.has(c.id) ? (tmdbIdToSlug[c.id] || '') : '',
          }));
        
        await client.execute({
          sql: 'UPDATE actors SET full_filmography_json = ? WHERE id = ?',
          args: [JSON.stringify(topCredits), actorId],
        });
      } catch (e) {
        console.log(`    [credits error] ${e.message}`);
      }
      
      enriched++;
      
      if (person.birthday) console.log(`    Born: ${person.birthday} | ${person.place_of_birth || 'unknown'}`);
      if (biography) console.log(`    Bio: ${biography.slice(0, 80)}...`);
      console.log(`    Photos: ${photos.length} | Filmography: enriched`);
      
    } catch (e) {
      console.log(`    [enrich error] ${e.message}`);
      errors.push({ slug, personId, error: e.message });
      
      // Still save the person_id even if details failed
      await client.execute({
        sql: 'UPDATE actors SET tmdb_person_id = ? WHERE id = ?',
        args: [personId, actorId],
      });
    }
  }
  
  // ── Summary ──
  console.log('\n' + '='.repeat(50));
  console.log('ENRICHMENT COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total actors: ${allActors.rows.length}`);
  console.log(`Already had ID: ${alreadyHadId}`);
  console.log(`Matched this run: ${matched}`);
  console.log(`  Layer 1 (Chinese name): ${matchLayer.L1}`);
  console.log(`  Layer 2 (Credits lookup): ${matchLayer.L2}`);
  console.log(`  Layer 3 (English name): ${matchLayer.L3}`);
  console.log(`Enriched (full details): ${enriched}`);
  console.log(`Skipped (no match): ${skipped}`);
  console.log(`Errors: ${errors.length}`);
  
  // Final stats
  const stats = await client.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN tmdb_person_id IS NOT NULL THEN 1 ELSE 0 END) as with_person_id,
      SUM(CASE WHEN birthday IS NOT NULL THEN 1 ELSE 0 END) as with_birthday,
      SUM(CASE WHEN birthplace IS NOT NULL THEN 1 ELSE 0 END) as with_birthplace,
      SUM(CASE WHEN photos_json IS NOT NULL THEN 1 ELSE 0 END) as with_photos,
      SUM(CASE WHEN full_filmography_json IS NOT NULL THEN 1 ELSE 0 END) as with_filmography
    FROM actors
  `);
  
  const s = stats.rows[0];
  console.log(`\nDB Stats:`);
  console.log(`  With TMDB Person ID: ${s.with_person_id}/${s.total}`);
  console.log(`  With birthday: ${s.with_birthday}/${s.total}`);
  console.log(`  With birthplace: ${s.with_birthplace}/${s.total}`);
  console.log(`  With photos: ${s.with_photos}/${s.total}`);
  console.log(`  With filmography: ${s.with_filmography}/${s.total}`);
  
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const e of errors) {
      console.log(`  ${e.slug} (person ${e.personId}): ${e.error}`);
    }
  }
  
  client.close();
  console.log('\nDone. Commit data/cdrama.db and push to deploy.');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
