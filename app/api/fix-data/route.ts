import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dramas, actors } from '@/lib/db/schema';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

/**
 * POST /api/fix-data?action=posters|actors|trailers
 * One-time data fix endpoint. Returns fix data for sandbox to apply.
 * Protected by FIX_SECRET env or query param.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'posters';
  const secret = searchParams.get('secret');
  
  // Simple protection
  if (secret !== 'cdrama-fix-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  const headers = {
    'Authorization': `Bearer ${TMDB_API_KEY}`,
    'Accept': 'application/json',
  };

  try {
    if (action === 'posters') {
      return await fixPosters(headers);
    } else if (action === 'actors') {
      return await fixActors(headers);
    } else if (action === 'trailers') {
      return await fixTrailers();
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function tmdbFetch(url: string, headers: Record<string, string>, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
      if (res.status === 429) {
        // Rate limited, wait and retry
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return null;
    } catch {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Fix posters: For each drama with tmdb_id, get correct poster_path and backdrop_path
 */
async function fixPosters(headers: Record<string, string>) {
  const allDramas = await db.select().from(dramas).all();
  const results: Array<{
    id: number;
    slug: string;
    tmdb_id: number;
    poster_path: string | null;
    backdrop_path: string | null;
    original_title: string;
  }> = [];
  
  let processed = 0;
  let found = 0;

  for (const drama of allDramas) {
    if (!drama.tmdbId || drama.tmdbId <= 0) continue;
    
    processed++;
    const data = await tmdbFetch(
      `${TMDB_BASE}/tv/${drama.tmdbId}?language=zh-CN`,
      headers
    );
    
    if (data && (data.poster_path || data.backdrop_path)) {
      results.push({
        id: drama.id,
        slug: drama.slug,
        tmdb_id: drama.tmdbId,
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null,
        original_title: drama.originalTitle,
      });
      found++;
    }
    
    // Rate limit: ~4 req/sec (TMDB allows 40/10s)
    await new Promise(r => setTimeout(r, 260));
  }

  return NextResponse.json({
    action: 'posters',
    processed,
    found,
    total_dramas: allDramas.length,
    results,
  });
}

/**
 * Fix actors: For each actor without photo, find via tmdb_person_id or drama credits
 */
async function fixActors(headers: Record<string, string>) {
  const allActors = await db.select().from(actors).all();
  const actorsWithoutPhoto = allActors.filter(a => !a.photoUrl);
  
  // Build drama slug -> tmdb_id map
  const allDramas = await db.select().from(dramas).all();
  const slugToTmdb: Record<string, number> = {};
  for (const d of allDramas) {
    if (d.tmdbId) slugToTmdb[d.slug] = d.tmdbId;
  }

  const results: Array<{
    id: number;
    name: string;
    profile_path: string | null;
    tmdb_person_id: number | null;
    found_via: string;
  }> = [];
  
  // Credits cache to avoid duplicate API calls
  const creditsCache: Record<number, any[]> = {};
  let processed = 0;
  let found = 0;

  for (const actor of actorsWithoutPhoto) {
    processed++;
    
    // Phase 1: Direct lookup if tmdb_person_id exists
    if (actor.tmdbPersonId && actor.tmdbPersonId > 0) {
      const data = await tmdbFetch(
        `${TMDB_BASE}/person/${actor.tmdbPersonId}`,
        headers
      );
      
      if (data && data.profile_path) {
        results.push({
          id: actor.id,
          name: actor.name,
          profile_path: data.profile_path,
          tmdb_person_id: actor.tmdbPersonId,
          found_via: 'person_id',
        });
        found++;
      }
      await new Promise(r => setTimeout(r, 260));
      continue;
    }
    
    // Phase 2: Find via drama credits
    if (!actor.dramasJson) continue;
    
    let dramaList: any[];
    try {
      dramaList = JSON.parse(actor.dramasJson);
    } catch {
      continue;
    }
    
    let foundInCredits = false;
    const actorNameLower = actor.name.toLowerCase().replace(/\s+/g, '');
    
    for (const entry of dramaList.slice(0, 5)) {
      const slug = typeof entry === 'object' ? (entry.slug || entry) : String(entry);
      const tmdbId = slugToTmdb[slug];
      if (!tmdbId) continue;
      
      // Use cache or fetch
      if (!creditsCache[tmdbId]) {
        const credits = await tmdbFetch(
          `${TMDB_BASE}/tv/${tmdbId}/credits?language=zh-CN`,
          headers
        );
        creditsCache[tmdbId] = credits?.cast || [];
        await new Promise(r => setTimeout(r, 260));
      }
      
      const cast = creditsCache[tmdbId] || [];
      for (const member of cast) {
        const memberName = (member.name || '').toLowerCase().replace(/\s+/g, '');
        const memberOrigName = (member.original_name || '').toLowerCase().replace(/\s+/g, '');
        
        if (actorNameLower === memberName || 
            actorNameLower === memberOrigName ||
            (actorNameLower.length > 3 && memberName.includes(actorNameLower)) ||
            (actorNameLower.length > 3 && actorNameLower.includes(memberName))) {
          
          if (member.profile_path) {
            results.push({
              id: actor.id,
              name: actor.name,
              profile_path: member.profile_path,
              tmdb_person_id: member.id,
              found_via: `credits:${slug}`,
            });
            found++;
            foundInCredits = true;
          } else {
            // Found person but no photo - still save person_id
            results.push({
              id: actor.id,
              name: actor.name,
              profile_path: null,
              tmdb_person_id: member.id,
              found_via: `credits:${slug}:no_photo`,
            });
            foundInCredits = true;
          }
          break;
        }
      }
      if (foundInCredits) break;
    }
  }

  return NextResponse.json({
    action: 'actors',
    processed,
    found,
    total_no_photo: actorsWithoutPhoto.length,
    results,
  });
}

/**
 * Fix trailers: Verify existing trailers via YouTube oEmbed
 */
async function fixTrailers() {
  // Read trailers from the static JSON
  const fs = await import('fs');
  const path = await import('path');
  const trailersPath = path.join(process.cwd(), 'data', 'trailers.json');
  
  let trailers: Record<string, string> = {};
  try {
    trailers = JSON.parse(fs.readFileSync(trailersPath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Cannot read trailers.json' }, { status: 500 });
  }

  const results: Array<{
    slug: string;
    video_id: string;
    valid: boolean;
    title?: string;
    error?: string;
  }> = [];

  for (const [slug, videoId] of Object.entries(trailers)) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      
      if (res.ok) {
        const data = await res.json();
        results.push({ slug, video_id: videoId, valid: true, title: data.title });
      } else {
        results.push({ slug, video_id: videoId, valid: false, error: `HTTP ${res.status}` });
      }
    } catch (err: any) {
      results.push({ slug, video_id: videoId, valid: false, error: err.message });
    }
    
    await new Promise(r => setTimeout(r, 300));
  }

  const valid = results.filter(r => r.valid).length;
  const invalid = results.filter(r => !r.valid).length;

  return NextResponse.json({
    action: 'trailers',
    total: results.length,
    valid,
    invalid,
    results,
  });
}

// Also support GET for quick checks
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== 'cdrama-fix-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allDramas = await db.select().from(dramas).all();
  const allActors = await db.select().from(actors).all();
  
  return NextResponse.json({
    status: 'ready',
    dramas: allDramas.length,
    actors: allActors.length,
    actors_no_photo: allActors.filter(a => !a.photoUrl).length,
    dramas_with_tmdb: allDramas.filter(d => d.tmdbId && d.tmdbId > 0).length,
  });
}
