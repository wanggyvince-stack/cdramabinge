import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isPlaceholderPoster } from '@/lib/utils/helpers';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const debug = request.nextUrl.searchParams.get('debug') === '1';
  
  if (!slug) {
    return NextResponse.json({ posterUrl: null, backdropUrl: null, error: 'Missing slug' });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ 
      posterUrl: null, 
      backdropUrl: null, 
      error: 'TMDB_API_KEY not configured',
      debug: debug ? { hasKey: false, envKeys: Object.keys(process.env).filter(k => k.includes('TMDB')).join(',') } : undefined
    });
  }

  try {
    // Get drama from DB to find English title
    const drama = await db.select().from(dramas).where(eq(dramas.slug, slug)).get();
    
    if (!drama) {
      return NextResponse.json({ posterUrl: null, backdropUrl: null, error: `Drama not found: ${slug}` });
    }

    // Parse English title
    let enTitle = drama.originalTitle;
    try {
      if (drama.titlesJson) {
        const titles = JSON.parse(drama.titlesJson);
        if (titles.en) enTitle = titles.en;
      }
    } catch {}

    // Search TMDB
    const searchUrl = `${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(enTitle)}&language=en-US&page=1`;
    
    let res: Response;
    try {
      res = await fetch(searchUrl, { next: { revalidate: 86400 } }); // Cache 24h
    } catch (fetchErr: any) {
      return NextResponse.json({ 
        posterUrl: null, 
        backdropUrl: null, 
        error: 'TMDB fetch failed',
        debug: debug ? { message: fetchErr?.message, url: searchUrl.replace(TMDB_API_KEY, '***') } : undefined
      });
    }

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ 
        posterUrl: null, 
        backdropUrl: null, 
        error: `TMDB returned ${res.status}`,
        debug: debug ? { status: res.status, body: text.substring(0, 500) } : undefined
      });
    }

    const data = await res.json();

    if (data.results?.length > 0) {
      // Prefer exact match
      const exact = data.results.find(
        (r: any) => r.name?.toLowerCase() === enTitle.toLowerCase()
      );
      const result = exact || data.results[0];
      
      const posterUrl = result.poster_path 
        ? `https://image.tmdb.org/t/p/w500${result.poster_path}` 
        : null;
      const backdropUrl = result.backdrop_path 
        ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` 
        : null;
      
      // Update DB so we don't need to fetch again
      if (posterUrl || backdropUrl) {
        try {
          const updates: any = {};
          if (posterUrl && isPlaceholderPoster(drama.posterUrl)) {
            updates.posterUrl = posterUrl;
          }
          if (backdropUrl && isPlaceholderPoster(drama.backdropUrl)) {
            updates.backdropUrl = backdropUrl;
          }
          if (Object.keys(updates).length > 0) {
            await db.update(dramas)
              .set(updates)
              .where(eq(dramas.slug, slug));
          }
        } catch {} // Ignore DB write errors on read-only filesystem
      }
      
      return NextResponse.json({ posterUrl, backdropUrl });
    }

    return NextResponse.json({ 
      posterUrl: null, 
      backdropUrl: null, 
      error: 'No TMDB results',
      debug: debug ? { searchedFor: enTitle, slug, resultCount: data.results?.length ?? 0, totalResults: data.total_results } : undefined
    });
  } catch (error: any) {
    return NextResponse.json({ 
      posterUrl: null, 
      backdropUrl: null, 
      error: 'Unexpected error',
      debug: debug ? { message: error?.message, stack: error?.stack?.substring(0, 500) } : undefined
    });
  }
}
