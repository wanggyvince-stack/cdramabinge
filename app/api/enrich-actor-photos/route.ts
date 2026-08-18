import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq, isNotNull, ne } from 'drizzle-orm';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

/**
 * API route: /api/enrich-actor-photos
 * 
 * Returns TMDB cast photo data for all dramas with tmdb_id.
 * Format: { [slug]: [{ character, profile_url, actor_name }] }
 * 
 * Client matches by (slug + character) to update local DB actor photo_url.
 */
export async function GET(request: NextRequest) {
  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  try {
    // Get all dramas with a valid tmdb_id
    const allDramas = await db.select().from(dramas).all();
    const dramasWithTmdb = allDramas.filter(d => d.tmdbId && d.tmdbId > 0);

    const results: Record<string, Array<{ character: string; profile_url: string; actor_name: string }>> = {};
    const errors: string[] = [];

    // Process dramas sequentially to avoid rate limiting
    for (const drama of dramasWithTmdb) {
      try {
        const res = await fetch(
          `${TMDB_BASE}/tv/${drama.tmdbId}/credits?language=zh-CN`,
          {
            headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
            next: { revalidate: 86400 },
          }
        );

        if (!res.ok) {
          errors.push(`${drama.slug}: TMDB ${res.status}`);
          continue;
        }

        const data = await res.json();
        const cast = data.cast || [];

        results[drama.slug] = cast
          .filter((c: any) => c.profile_path)
          .map((c: any) => ({
            character: c.character || '',
            profile_url: `${TMDB_IMG}${c.profile_path}`,
            actor_name: c.name || '',
          }));

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 250));
      } catch (err: any) {
        errors.push(`${drama.slug}: ${err.message}`);
      }
    }

    return NextResponse.json({
      total_dramas: dramasWithTmdb.length,
      dramas_with_cast: Object.keys(results).length,
      total_cast_entries: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
      errors,
      data: results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
