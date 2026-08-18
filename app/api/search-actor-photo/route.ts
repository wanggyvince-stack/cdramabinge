import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { actors } from '@/lib/db/schema';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

/**
 * API route: /api/search-actor-photo
 * 
 * Searches TMDB person API for actors without photos.
 * Returns: { results: [{ slug, name, name_zh, profile_url }] }
 */
export async function GET(request: NextRequest) {
  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  try {
    // Get actors without photos
    const allActors = await db.select().from(actors).all();
    const actorsNoPhoto = allActors.filter(a => !a.photoUrl || a.photoUrl === '');

    const results: Array<{ slug: string; name: string; name_zh: string; profile_url: string }> = [];
    const errors: string[] = [];

    for (const actor of actorsNoPhoto) {
      let names: { en?: string; zh?: string } = {};
      try {
        names = JSON.parse(actor.namesJson || '{}');
      } catch {}

      const searchName = names.zh || names.en || actor.name;
      
      try {
        const res = await fetch(
          `${TMDB_BASE}/search/person?query=${encodeURIComponent(searchName)}&language=zh-CN`,
          {
            headers: { Authorization: `Bearer ${TMDB_API_KEY}` },
            next: { revalidate: 86400 },
          }
        );

        if (!res.ok) {
          errors.push(`${actor.slug}: TMDB ${res.status}`);
          continue;
        }

        const data = await res.json();
        const person = data.results?.[0];

        if (person?.profile_path) {
          results.push({
            slug: actor.slug,
            name: names.en || actor.name,
            name_zh: names.zh || '',
            profile_url: `${TMDB_IMG}${person.profile_path}`,
          });
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        errors.push(`${actor.slug}: ${err.message}`);
      }
    }

    return NextResponse.json({
      total_searched: actorsNoPhoto.length,
      found: results.length,
      errors,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
